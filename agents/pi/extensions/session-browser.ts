import path from "node:path";
import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { SessionManager } from "@mariozechner/pi-coding-agent";

let AUTO_NAME_LIMIT = 60;
let SESSION_PREVIEW_LIMIT = 72;
let MODEL_TITLE_LIMIT = 48;

let lastModelTitledSessionFile: string | undefined;

type SessionMode = "all" | "current";

type SessionChoice = {
	label: string;
	path: string;
};

export default function sessionBrowserExtension(pi: ExtensionAPI) {
	pi.registerCommand("sessions", {
		description: "Browse saved sessions and switch to one (usage: /sessions [all|current])",
		getArgumentCompletions: getSessionModeCompletions,
		handler: async (args, ctx) => {
			let mode = parseMode(args);
			let sessions = await loadSessions(mode, ctx);

			if (sessions.length === 0 && mode === "current") {
				let fallback = await ctx.ui.confirm(
					"No project sessions",
					"No saved sessions were found for this project. Browse all sessions instead?",
				);
				if (!fallback) return;
				mode = "all";
				sessions = await loadSessions(mode, ctx);
			}

			if (sessions.length === 0) {
				ctx.ui.notify("No saved sessions found", "info");
				return;
			}

			let title = mode === "all" ? "Resume Session (all projects)" : "Resume Session (current project)";
			let items = sessions.map((session) => session.label);
			let selected = await ctx.ui.select(title, items);
			if (!selected) return;

			let choice = sessions.find((session) => session.label === selected);
			if (!choice) {
				ctx.ui.notify("Could not resolve selected session", "error");
				return;
			}

			let currentSession = ctx.sessionManager.getSessionFile();
			if (currentSession === choice.path) {
				ctx.ui.notify("Already in that session", "info");
				return;
			}

			await ctx.waitForIdle();
			let result = await ctx.switchSession(choice.path);
			if (!result.cancelled) {
				ctx.ui.notify(`Resumed ${path.basename(choice.path)}`, "info");
			}
		},
	});

	pi.registerCommand("session-name", {
		description: "Show, set, or auto-generate the session name (usage: /session-name [name|auto])",
		handler: async (args, ctx) => {
			let input = args.trim();
			if (!input) {
				let current = pi.getSessionName();
				ctx.ui.notify(current ? `Session: ${current}` : "No session name set", "info");
				return;
			}

			if (input === "auto") {
				let derived = deriveNameFromSession(ctx);
				if (!derived) {
					ctx.ui.notify("Could not derive a session name yet", "warning");
					return;
				}
				pi.setSessionName(derived);
				ctx.ui.notify(`Session named: ${derived}`, "info");
				return;
			}

			pi.setSessionName(input);
			ctx.ui.notify(`Session named: ${input}`, "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		ensureAutoName(pi, ctx);
	});

	pi.on("session_switch", async (_event, ctx) => {
		ensureAutoName(pi, ctx);
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "user") return;
		ensureAutoName(pi, ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		await maybeGenerateBetterTitle(pi, ctx);
	});
}

function getSessionModeCompletions(prefix: string) {
	let modes = ["all", "current"];
	let items = modes
		.filter((mode) => mode.startsWith(prefix))
		.map((mode) => ({ value: mode, label: mode }));
	return items.length > 0 ? items : null;
}

function parseMode(args: string): SessionMode {
	let value = args.trim().toLowerCase();
	if (value === "current") return "current";
	return "all";
}

async function loadSessions(mode: SessionMode, ctx: ExtensionContext): Promise<SessionChoice[]> {
	let infos = mode === "all" ? await SessionManager.listAll() : await SessionManager.list(ctx.cwd);
	infos.sort((a, b) => b.modified.getTime() - a.modified.getTime());
	return infos.map((info) => ({
		label: formatSessionLabel(info.path, info.cwd, info.name, info.firstMessage, info.modified),
		path: info.path,
	}));
}

function formatSessionLabel(
	sessionPath: string,
	cwd: string,
	name: string | undefined,
	firstMessage: string,
	modified: Date,
): string {
	let heading = name?.trim() || summarize(firstMessage, SESSION_PREVIEW_LIMIT) || "Untitled session";
	let project = cwd ? path.basename(cwd) : "unknown-project";
	let timestamp = formatTimestamp(modified);
	let shortId = path.basename(sessionPath).replace(/\.jsonl$/, "");
	return `${heading} — ${project} — ${timestamp} — ${shortId}`;
}

function formatTimestamp(value: Date): string {
	let month = String(value.getMonth() + 1).padStart(2, "0");
	let day = String(value.getDate()).padStart(2, "0");
	let hours = String(value.getHours()).padStart(2, "0");
	let minutes = String(value.getMinutes()).padStart(2, "0");
	return `${value.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
}

function ensureAutoName(pi: ExtensionAPI, ctx: ExtensionContext) {
	if (pi.getSessionName()) return;
	let derived = deriveNameFromSession(ctx);
	if (!derived) return;
	pi.setSessionName(derived);
}

async function maybeGenerateBetterTitle(pi: ExtensionAPI, ctx: ExtensionContext) {
	let sessionFile = ctx.sessionManager.getSessionFile();
	if (sessionFile && lastModelTitledSessionFile === sessionFile) return;

	let currentName = pi.getSessionName();
	let fallbackName = deriveNameFromSession(ctx);
	if (!fallbackName) return;
	if (currentName && currentName !== fallbackName) return;

	let transcript = buildNamingTranscript(ctx);
	if (!transcript) return;

	let model = ctx.model;
	if (!model) return;
	let apiKey = await ctx.modelRegistry.getApiKey(model);
	if (!apiKey) return;

	try {
		let response = await complete(
			model,
			{
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `Create a short session title for this coding conversation.

Requirements:
- 2 to 6 words
- plain text only
- no quotes
- no markdown
- no ending punctuation
- prefer specific task-oriented titles
- keep under ${MODEL_TITLE_LIMIT} characters

Conversation:
${transcript}`,
							},
						],
						timestamp: Date.now(),
					},
				],
			},
			{ apiKey, maxTokens: 32 },
		);
		let title = response.content
			.filter((block): block is { type: "text"; text: string } => block.type === "text")
			.map((block) => block.text)
			.join(" ");
		let normalized = normalizeModelTitle(title);
		if (!normalized) return;
		pi.setSessionName(normalized);
		lastModelTitledSessionFile = sessionFile;
	} catch {
		return;
	}
}

function deriveNameFromSession(ctx: ExtensionContext): string | undefined {
	for (let entry of ctx.sessionManager.getEntries()) {
		if (entry.type !== "message") continue;
		if (entry.message.role !== "user") continue;
		let text = extractUserText(entry.message.content);
		let name = summarize(text, AUTO_NAME_LIMIT);
		if (name) return name;
	}
	return undefined;
}

function buildNamingTranscript(ctx: ExtensionContext): string | undefined {
	let lines: string[] = [];
	let userCount = 0;
	let assistantCount = 0;

	for (let entry of ctx.sessionManager.getEntries()) {
		if (entry.type !== "message") continue;
		if (entry.message.role === "user") {
			let text = extractUserText(entry.message.content);
			if (!text) continue;
			lines.push(`User: ${text}`);
			userCount++;
		}
		if (entry.message.role === "assistant") {
			let text = extractAssistantText(entry.message.content);
			if (!text) continue;
			lines.push(`Assistant: ${text}`);
			assistantCount++;
		}
		if (userCount >= 1 && assistantCount >= 1) break;
	}

	if (userCount === 0 || assistantCount === 0) return undefined;
	return lines.join("\n\n");
}

function extractUserText(content: string | Array<{ type: string; text?: string }>): string {
	if (typeof content === "string") return content;
	let parts: string[] = [];
	for (let block of content) {
		if (block.type !== "text") continue;
		if (!block.text) continue;
		parts.push(block.text);
	}
	return parts.join(" ");
}

function extractAssistantText(content: Array<{ type: string; text?: string }>): string {
	let parts: string[] = [];
	for (let block of content) {
		if (block.type !== "text") continue;
		if (!block.text) continue;
		parts.push(block.text);
	}
	return summarize(parts.join(" "), 400) || "";
}

function normalizeModelTitle(text: string): string | undefined {
	let normalized = text.replace(/\s+/g, " ").trim();
	normalized = normalized.replace(/^['"`]+|['"`]+$/g, "");
	normalized = normalized.replace(/[.!?:;,-]+$/g, "");
	if (!normalized) return undefined;
	if (normalized.length > MODEL_TITLE_LIMIT) {
		normalized = summarize(normalized, MODEL_TITLE_LIMIT) || "";
	}
	return normalized || undefined;
}

function summarize(text: string, maxLength: number): string | undefined {
	let normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) return undefined;
	if (normalized.length <= maxLength) return normalized;
	return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
