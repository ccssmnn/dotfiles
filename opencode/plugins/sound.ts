import type { Plugin } from "@opencode-ai/plugin"

export const SoundPlugin: Plugin = async ({ $, directory }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await $`afplay /System/Library/Sounds/Purr.aiff`
      }
    },
  }
}
