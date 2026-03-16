import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Task Completion TTS Extension
 * 
 * When the agent finishes a task, extracts the task summary from special
 * <summary> tags in the final response and announces it via TTS.
 * 
 * Usage: Place in ~/.pi/agent/extensions/ or use `pi -e ./path.ts`
 */

export default function (pi: ExtensionAPI) {
  // Inject instruction to summarize work in special tags
  pi.on("before_agent_start", async (event, ctx) => {
    return {
      systemPrompt: event.systemPrompt + 
        "\n\nIMPORTANT: When you finish your task, output a brief (3-5 word) summary of what you did inside <summary> tags. Example: <summary>created TTS extension for pi</summary>. This is for a voice notification system. Do not include any other text outside the summary tags - the tags should be at the end of your final response."
    };
  });

  // Listen for agent completion and speak the summary
  pi.on("agent_end", async (event, ctx) => {
    // Get project name from current working directory
    const project = ctx.cwd.split("/").pop() || "project";
    
    // Get the branch entries to find the final assistant message
    const entries = ctx.sessionManager.getBranch();
    
    // Find the last assistant message with content
    let summary = "";
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.type === "message" && entry.message.role === "assistant") {
        const content = entry.message.content;
        if (Array.isArray(content)) {
          const textContent = content.find((c: any) => c.type === "text");
          if (textContent?.text) {
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

    // If we found a summary, speak it
    if (summary) {
      const phrase = `${project} - ${summary}`;
      
      try {
        await pi.exec("say", ["-v", "Samantha", "-r", "180", phrase]);
      } catch (e) {
        console.log("[task-complete-tts] TTS failed:", e);
      }
    }
  });

  // Register a command to test TTS
  pi.registerCommand("tts-test", {
    description: "Test the TTS announcement",
    handler: async (args, ctx) => {
      const project = ctx.cwd.split("/").pop() || "project";
      const phrase = `Finished testing TTS in ${project}`;
      await pi.exec("say", ["-v", "Samantha", "-r", "180", phrase]);
      ctx.ui.notify("TTS test played!", "info");
    },
  });
}
