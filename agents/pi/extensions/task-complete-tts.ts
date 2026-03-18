import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Task Completion TTS Extension
 *
 * When the agent finishes a task, extracts the task summary from special
 * <summary> tags in the final response and announces it via OpenAI's TTS API.
 *
 * Plays a pling sound first, then a 1 second delay, then the voice.
 *
 * Requirements:
 * - Set OPENAI_API_KEY environment variable with your OpenAI API key
 *
 * Usage: Place in ~/.pi/agent/extensions/ or use `pi -e ./path.ts`
 */

const OPENAI_TTS_MODEL = "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = "ash";
const OPENAI_CHAT_MODEL = "gpt-4.1-nano";
const PLING_SOUND = "/System/Library/Sounds/Purr.aiff";

async function callOpenAITTS(apiKey: string, text: string): Promise<Buffer> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: OPENAI_TTS_VOICE,
      input: text,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS API error: ${response.status} ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateSummary(apiKey: string, responseText: string): Promise<string | null> {
  try {
    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates brief 3-5 word summaries of tasks. Be concise and descriptive."
          },
          {
            role: "user",
            content: `Create a brief 3-5 word summary of what was accomplished in this response:\n\n${responseText.slice(0, 2000)}`
          }
        ],
        max_tokens: 20,
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.log("[task-complete-tts] Summary generation failed:", error);
      return null;
    }

    const data = await chatResponse.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.log("[task-complete-tts] Summary generation error:", e);
    return null;
  }
}

async function playAudio(pi: ExtensionAPI, filePath: string): Promise<void> {
  try {
    await pi.exec("afplay", [filePath]);
  } catch (e) {
    console.log("[task-complete-tts] Failed to play audio:", e);
  }
}

async function playPling(pi: ExtensionAPI): Promise<void> {
  try {
    await pi.exec("afplay", [PLING_SOUND]);
  } catch (e) {
    console.log("[task-complete-tts] Failed to play pling:", e);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function speakWithOS(pi: ExtensionAPI, text: string): Promise<void> {
  try {
    await pi.exec("say", [text]);
  } catch (e) {
    console.log("[task-complete-tts] OS TTS failed:", e);
    throw e;
  }
}

export default function (pi: ExtensionAPI) {
  // Inject instruction to summarize work in special tags
  pi.on("before_agent_start", async (event, ctx) => {
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\nIMPORTANT: When you finish your task, output a brief (3-5 word) summary of what you did inside <summary> tags. Example: <summary>created TTS extension for pi</summary>. This is for a voice notification system. Do not include any other text outside the summary tags - the tags should be at the end of your final response.",
    };
  });

  // Listen for agent completion and speak the summary
  pi.on("agent_end", async (event, ctx) => {
    // Get project name from current working directory
    const project = ctx.cwd.split("/").pop() || "project";

    // Get the branch entries to find the final assistant message
    const entries = ctx.sessionManager.getBranch();

    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.log(
        "[task-complete-tts] OPENAI_API_KEY not set. Skipping TTS.",
      );
      ctx.ui.notify("TTS: OPENAI_API_KEY not set", "warning");
      return;
    }

    // Find the last assistant message with content
    let summary = "";
    let lastResponseText = "";
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.type === "message" && entry.message.role === "assistant") {
        const content = entry.message.content;
        if (Array.isArray(content)) {
          const textContent = content.find((c: any) => c.type === "text");
          if (textContent?.text) {
            lastResponseText = textContent.text;
            // Look for <summary>...</summary> pattern
            const match = textContent.text.match(/<summary>([^<]+)<\/summary>/);
            if (match && match[1]) {
              summary = match[1].trim();
            }
            break;
          }
        }
      }
    }

    // If no summary tags found, generate one using the chat model
    if (!summary && lastResponseText) {
      const generatedSummary = await generateSummary(apiKey, lastResponseText);
      if (generatedSummary) {
        summary = generatedSummary;
        console.log("[task-complete-tts] Generated summary:", summary);
      }
    }

    // If we found a summary, speak it using OpenAI TTS
    if (summary) {
      const phrase = `${project} - ${summary}`;

      try {
        // Generate speech using OpenAI TTS
        const audioData = await callOpenAITTS(apiKey, phrase);

        // Save to temp file
        const tempFile = join(tmpdir(), `pi-tts-${Date.now()}.mp3`);
        await writeFile(tempFile, audioData);

        // Play pling sound
        await playPling(pi);

        // Play the generated speech
        await playAudio(pi, tempFile);

        // Cleanup temp file
        await unlink(tempFile).catch(() => {});
      } catch (e) {
        console.log("[task-complete-tts] OpenAI TTS failed, falling back to OS TTS:", e);
        try {
          await playPling(pi);
          await delay(1000);
          await speakWithOS(pi, phrase);
        } catch (fallbackError) {
          console.log("[task-complete-tts] OS TTS also failed:", fallbackError);
          ctx.ui.notify(`TTS error: ${e}`, "error");
        }
      }
    }
  });

  // Register a command to test TTS
  pi.registerCommand("tts-test", {
    description: "Test the OpenAI TTS announcement",
    handler: async (args, ctx) => {
      const project = ctx.cwd.split("/").pop() || "project";
      const phrase = `Finished testing TTS in ${project}`;

      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        ctx.ui.notify("OPENAI_API_KEY not set", "error");
        return;
      }

      try {
        const audioData = await callOpenAITTS(apiKey, phrase);
        const tempFile = join(tmpdir(), `pi-tts-test-${Date.now()}.mp3`);
        await writeFile(tempFile, audioData);

        await playPling(pi);
        await delay(1000);
        await playAudio(pi, tempFile);

        await unlink(tempFile).catch(() => {});

        ctx.ui.notify("TTS test played!", "info");
      } catch (e) {
        console.log("[task-complete-tts] OpenAI TTS test failed, falling back to OS TTS:", e);
        try {
          await playPling(pi);
          await delay(1000);
          await speakWithOS(pi, phrase);
          ctx.ui.notify("TTS test played (OS fallback)!", "info");
        } catch (fallbackError) {
          ctx.ui.notify(`TTS test failed: ${e}`, "error");
        }
      }
    },
  });
}
