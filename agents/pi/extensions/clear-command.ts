import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function clearCommandExtension(pi: ExtensionAPI) {
	pi.registerCommand("clear", {
		description: "Start a new session and reload extensions, skills, and prompts",
		handler: async (_args, ctx) => {
			let result = await ctx.newSession();
			if (result.cancelled) {
				ctx.ui.notify("/clear cancelled", "info");
				return;
			}

			await ctx.reload();
			return;
		},
	});
}
