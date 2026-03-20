import type { Plugin } from "@opencode-ai/plugin";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const maxSummaryLength = 140;

const ttsPreferences = {
  enabled: true,
  soundPath: "/System/Library/Sounds/Purr.aiff",
  openAiVoice: "ash",
  openAiModel: "gpt-4o-mini-tts",
  openAiSpeed: 1.5,
  summaryModel: "gpt-5.4-nano",
  fallbackVoice: "Samantha",
} as const;

type SessionMessage = {
  info?: {
    id?: string;
    role?: string;
  };
  parts?: Array<{
    type?: string;
    text?: string;
    ignored?: boolean;
  }>;
};

function isEnabled() {
  return ttsPreferences.enabled;
}

function projectNameFrom(directory: string) {
  const parts = directory.split("/").filter(Boolean);
  return parts.at(-1) ?? "project";
}

function openAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim();
}

function openAiTtsSpeed() {
  const value = Number(ttsPreferences.openAiSpeed);

  if (!Number.isFinite(value)) return 1;
  return Math.max(0.25, Math.min(4, value));
}

function cleanAnnouncementText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[#>*\-\d.\s]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function buildSummary(value: string) {
  const cleaned = cleanAnnouncementText(value);

  if (!cleaned) return "task ready";

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return truncate(firstSentence, maxSummaryLength);
}

async function generateSummary(value: string) {
  const apiKey = openAiApiKey();

  if (!apiKey) {
    return buildSummary(value);
  }

  const cleaned = cleanAnnouncementText(value);

  if (!cleaned) {
    return "task ready";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ttsPreferences.summaryModel,
        messages: [
          {
            role: "system",
            content:
              "Write a short spoken summary for a coding task completion announcement. Return one sentence, under 18 words, plain text only.",
          },
          {
            role: "user",
            content: cleaned.slice(0, 4000),
          },
        ],
        max_tokens: 40,
      }),
    });

    if (!response.ok) {
      return buildSummary(cleaned);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const summary = data.choices?.[0]?.message?.content?.trim();
    return summary ? truncate(cleanAnnouncementText(summary), maxSummaryLength) : buildSummary(cleaned);
  } catch {
    return buildSummary(cleaned);
  }
}

type PluginClient = Parameters<Plugin>[0]["client"];

function latestAssistantMessage(messages: SessionMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.info?.role !== "assistant") continue;

    const text = (message.parts ?? [])
      .filter((part) => part.type === "text" && !part.ignored && part.text)
      .map((part) => part.text?.trim() ?? "")
      .join(" ")
      .trim();

    if (!text) continue;

    return {
      id: message.info?.id ?? text,
      text,
    };
  }
}

async function fetchMessages(client: PluginClient, directory: string, sessionID: string) {
  const response = await client.session.messages({
    path: {
      id: sessionID,
    },
    query: {
      directory,
      limit: 12,
    },
  });

  return response.data as SessionMessage[];
}

async function playSound($: Parameters<Plugin>[0]["$"]) {
  await $`afplay ${ttsPreferences.soundPath}`.quiet().nothrow();
}

async function speakWithSystemVoice($: Parameters<Plugin>[0]["$"], phrase: string) {
  await $`say -v ${ttsPreferences.fallbackVoice} ${phrase}`.quiet().nothrow();
}

async function createOpenAiSpeech(text: string) {
  const apiKey = openAiApiKey();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ttsPreferences.openAiModel,
      voice: ttsPreferences.openAiVoice,
      speed: openAiTtsSpeed(),
      input: text,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS failed: ${response.status} ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function speakWithOpenAi($: Parameters<Plugin>[0]["$"], phrase: string) {
  const filePath = join(tmpdir(), `opencode-tts-${Date.now()}.mp3`);

  try {
    const audio = await createOpenAiSpeech(phrase);
    await writeFile(filePath, audio);
    await $`afplay ${filePath}`.quiet().nothrow();
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

async function announce($: Parameters<Plugin>[0]["$"], phrase: string) {
  await playSound($);

  try {
    await speakWithOpenAi($, phrase);
    return;
  } catch {
    await speakWithSystemVoice($, phrase);
  }
}

export const TtsAnnouncementsPlugin: Plugin = async ({ $, client, directory }) => {
  const projectName = projectNameFrom(directory);
  const announcedMessages = new Map<string, string>();

  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle" || !isEnabled()) return;

      const sessionID = event.properties.sessionID;

      try {
        const messages = await fetchMessages(client, directory, sessionID);
        const latest = latestAssistantMessage(messages);

        if (!latest) return;
        if (announcedMessages.get(sessionID) === latest.id) return;

        announcedMessages.set(sessionID, latest.id);

        const summary = await generateSummary(latest.text);
        await announce($, `${projectName}. ${summary}`);
        return;
      } catch {}

      await announce($, `${projectName}. task ready`);
    },
  };
};
