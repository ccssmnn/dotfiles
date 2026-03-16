import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead, keyHint } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Text } from "@mariozechner/pi-tui";

const BraveSearchParams = Type.Object({
	query: Type.String({ description: "Search query" }),
	count: Type.Optional(Type.Number({ description: "Number of results to return (1-20)", minimum: 1, maximum: 20 })),
	country: Type.Optional(Type.String({ description: "2-letter country code, e.g. us, de, gb" })),
	search_lang: Type.Optional(Type.String({ description: "Language code, e.g. en, de" })),
	safesearch: Type.Optional(StringEnum(["off", "moderate", "strict"] as const)),
	freshness: Type.Optional(StringEnum(["pd", "pw", "pm", "py"] as const)),
	timeoutMs: Type.Optional(Type.Number({ description: "Request timeout in milliseconds", minimum: 1000, maximum: 120000 })),
	maxBytes: Type.Optional(Type.Number({ description: `Max bytes returned to the model (default: ${DEFAULT_MAX_BYTES})`, minimum: 1000, maximum: 500000 })),
});

interface SearchResultItem {
	title: string;
	url: string;
	description: string;
	age?: string;
}

interface BraveSearchDetails {
	query: string;
	countRequested: number;
	countReturned: number;
	endpoint: string;
	truncated: boolean;
	fullOutputPath?: string;
	results: SearchResultItem[];
	raw?: unknown;
}

function clampTimeout(timeoutMs?: number): number {
	if (!timeoutMs) return 15000;
	return Math.max(1000, Math.min(120000, Math.floor(timeoutMs)));
}

function clampMaxBytes(maxBytes?: number): number {
	if (!maxBytes) return DEFAULT_MAX_BYTES;
	return Math.max(1000, Math.min(500000, Math.floor(maxBytes)));
}

function stripHtml(value: string): string {
	return value
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function getApiKey(): string | undefined {
	return process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
}

function getWebResults(data: any): SearchResultItem[] {
	const items = Array.isArray(data?.web?.results) ? data.web.results : [];
	return items.map((item: any) => ({
		title: stripHtml(String(item?.title ?? "Untitled")),
		url: String(item?.url ?? ""),
		description: stripHtml(String(item?.description ?? "")),
		age: item?.age ? String(item.age) : undefined,
	}));
}

export default function braveSearchExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description: "Search the web via Brave Search API and return compact ranked results.",
		promptSnippet: "Search the web via Brave API and return concise result list with URLs",
		promptGuidelines: [
			"Use this tool when current repo/local files are insufficient and fresh external info is needed.",
			"Prefer this over broad page fetches when you first need candidate sources.",
		],
		parameters: BraveSearchParams,
		renderCall(args, theme) {
			const query = args.query?.length > 50 ? args.query.substring(0, 47) + "..." : args.query;
			let text = theme.fg("toolTitle", "web_search ");
			text += theme.fg("dim", query);
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) {
				return new Text(theme.fg("warning", "Searching..."), 0, 0);
			}

			const details = result.details as BraveSearchDetails | undefined;
			if (!details) {
				return new Text(theme.fg("error", "No details"), 0, 0);
			}

			// Compact view: 1 line
			const count = details.countReturned;
			const truncated = details.truncated ? " (truncated)" : "";
			let text = theme.fg("success", "✓") + theme.fg("muted", ` ${count} result${count !== 1 ? "s" : ""} for "${details.query}"${truncated}`);

			// Expanded view: show results
			if (expanded) {
				text += "\n";
				for (const r of details.results.slice(0, 8)) {
					text += "\n" + theme.fg("accent", r.title.substring(0, 60));
					text += "\n  " + theme.fg("dim", r.url.substring(0, 70));
					if (r.description) {
						text += "\n  " + theme.fg("muted", r.description.substring(0, 100));
					}
				}
				if (details.results.length > 8) {
					text += "\n" + theme.fg("dim", `...and ${details.results.length - 8} more`);
				}
				if (details.fullOutputPath) {
					text += "\n" + theme.fg("warning", `Full output: ${details.fullOutputPath}`);
				}
			} else {
				text += ` (${keyHint("expandTools", "expand")})`;
			}

			return new Text(text, 0, 0);
		},
		async execute(_toolCallId, params, signal) {
			const apiKey = getApiKey();
			if (!apiKey) {
				throw new Error("Missing Brave API key. Set BRAVE_SEARCH_API_KEY (or BRAVE_API_KEY). ");
			}

			const timeoutMs = clampTimeout(params.timeoutMs);
			const maxBytes = clampMaxBytes(params.maxBytes);
			const count = Math.max(1, Math.min(20, Math.floor(params.count ?? 8)));

			const query = new URLSearchParams({
				q: params.query,
				count: String(count),
				...(params.country ? { country: params.country } : {}),
				...(params.search_lang ? { search_lang: params.search_lang } : {}),
				...(params.safesearch ? { safesearch: params.safesearch } : {}),
				...(params.freshness ? { freshness: params.freshness } : {}),
			});

			const endpoint = `https://api.search.brave.com/res/v1/web/search?${query.toString()}`;

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
			const abortHandler = () => controller.abort(signal?.reason ?? new Error("Aborted"));
			signal?.addEventListener("abort", abortHandler);

			try {
				const response = await fetch(endpoint, {
					signal: controller.signal,
					headers: {
						Accept: "application/json",
						"Accept-Encoding": "gzip",
						"X-Subscription-Token": apiKey,
					},
				});

				const text = await response.text();
				if (!response.ok) {
					throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${text.slice(0, 1000)}`);
				}

				const data = JSON.parse(text);
				const results = getWebResults(data).filter((r) => r.url);

				const rendered = [
					`Query: ${params.query}`,
					`Results: ${results.length}`,
					"",
					...results.map((result, i) => {
						const bits = [`${i + 1}. ${result.title}`, `   URL: ${result.url}`];
						if (result.description) bits.push(`   Snippet: ${result.description}`);
						if (result.age) bits.push(`   Age: ${result.age}`);
						return bits.join("\n");
					}),
				].join("\n");

				const truncation = truncateHead(rendered, { maxLines: DEFAULT_MAX_LINES, maxBytes });
				const details: BraveSearchDetails = {
					query: params.query,
					countRequested: count,
					countReturned: results.length,
					endpoint,
					truncated: truncation.truncated,
					results,
					raw: data,
				};

				let output = truncation.content;
				if (truncation.truncated) {
					const tempDir = await mkdtemp(join(tmpdir(), "pi-web-search-"));
					const fullOutputPath = join(tempDir, "results.txt");
					await writeFile(fullOutputPath, rendered, "utf8");
					details.fullOutputPath = fullOutputPath;
					output += `\n\n[Output truncated: showing ${truncation.outputLines}/${truncation.totalLines} lines (${formatSize(truncation.outputBytes)}/${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
				}

				return {
					content: [{ type: "text", text: output }],
					details,
				};
			} finally {
				clearTimeout(timeout);
				signal?.removeEventListener("abort", abortHandler);
			}
		},
	});
}
