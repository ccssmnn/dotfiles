import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WebFetchParams = Type.Object({
	url: Type.String({ description: "URL to fetch" }),
	format: Type.Optional(StringEnum(["auto", "text", "html"] as const)),
	maxBytes: Type.Optional(
		Type.Number({
			description: `Max bytes returned to the model (default: ${DEFAULT_MAX_BYTES})`,
			minimum: 1_000,
			maximum: 500_000,
		}),
	),
	timeoutMs: Type.Optional(
		Type.Number({
			description: "Request timeout in milliseconds",
			minimum: 1_000,
			maximum: 120_000,
		}),
	),
	includeLinks: Type.Optional(Type.Boolean({ description: "Include relevant links extracted from page (default: true)" })),
	linkPatterns: Type.Optional(
		Type.Array(Type.String(), {
			description: "Only include links that match every pattern (regex or substring fallback)",
		}),
	),
	maxLinks: Type.Optional(Type.Number({ description: "Max links returned when includeLinks=true", minimum: 1, maximum: 100 })),
});

interface WebLink {
	url: string;
	description: string;
}

interface WebFetchDetails {
	url: string;
	finalUrl: string;
	status: number;
	contentType: string;
	format: "text" | "html";
	truncated: boolean;
	fullOutputPath?: string;
	responseBytes: number;
	title?: string;
	links?: WebLink[];
	extractor: "readability" | "fallback";
}

function normalizeUrl(input: string): string {
	const trimmed = input.trim();
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

function decodeHtmlEntities(value: string): string {
	const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
	return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
		if (entity[0] === "#") {
			const isHex = entity[1]?.toLowerCase() === "x";
			const num = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
			if (!Number.isFinite(num)) return match;
			try {
				return String.fromCodePoint(num);
			} catch {
				return match;
			}
		}
		return named[entity.toLowerCase()] ?? match;
	});
}

function extractTitle(html: string): string | undefined {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (!match?.[1]) return undefined;
	return decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim()) || undefined;
}

function fallbackHtmlToText(html: string): string {
	const region =
		html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
		html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
		html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
		html;

	let out = region;
	out = out.replace(/<!--[\s\S]*?-->/g, "");
	out = out.replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, "");
	out = out.replace(/<(br|hr)\s*\/?>/gi, "\n");
	out = out.replace(/<li[^>]*>/gi, "\n- ");
	out = out.replace(/<\/(p|div|section|article|aside|nav|header|footer|h1|h2|h3|h4|h5|h6|pre|blockquote|tr|table|ul|ol)>/gi, "\n");
	out = out.replace(/<[^>]+>/g, "");
	out = decodeHtmlEntities(out);
	out = out.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
	return out.trim();
}

function urlMatchesPatterns(url: string, patterns?: string[]): boolean {
	if (!patterns?.length) return true;
	return patterns.every((pattern) => {
		try {
			return new RegExp(pattern).test(url);
		} catch {
			return url.includes(pattern);
		}
	});
}

function extractLinksFallback(html: string, baseUrl: string, patterns?: string[], maxLinks = 20): WebLink[] {
	const links: WebLink[] = [];
	const regex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	for (const match of html.matchAll(regex)) {
		const href = match[1]?.trim();
		if (!href || href.startsWith("#")) continue;
		let fullUrl: string;
		try {
			fullUrl = new URL(href, baseUrl).href;
		} catch {
			continue;
		}
		if (!/^https?:\/\//.test(fullUrl)) continue;
		if (!urlMatchesPatterns(fullUrl, patterns)) continue;

		const description = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
		if (!description) continue;
		if (/^(home|about|contact|privacy|terms|login|signup|register)$/i.test(description)) continue;

		if (!links.find((link) => link.url === fullUrl)) {
			links.push({ url: fullUrl, description });
			if (links.length >= maxLinks) break;
		}
	}
	return links;
}

async function extractWithReadability(
	html: string,
	baseUrl: string,
	patterns?: string[],
	maxLinks = 20,
): Promise<{ text: string; links: WebLink[] } | undefined> {
	try {
		const [{ JSDOM }, readability] = await Promise.all([import("jsdom"), import("@mozilla/readability")]);
		const dom = new JSDOM(html, { url: baseUrl });
		const reader = new readability.Readability(dom.window.document);
		const article = reader.parse();
		const text = article?.textContent?.replace(/\s+/g, " ").trim() ?? "";

		const links: WebLink[] = [];
		const nodes = dom.window.document.querySelectorAll("a[href]");
		for (const node of nodes) {
			const href = node.getAttribute("href")?.trim();
			if (!href || href.startsWith("#")) continue;
			let fullUrl: string;
			try {
				fullUrl = new URL(href, baseUrl).href;
			} catch {
				continue;
			}
			if (!/^https?:\/\//.test(fullUrl)) continue;
			if (!urlMatchesPatterns(fullUrl, patterns)) continue;

			const description = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
			if (!description) continue;
			if (/^(home|about|contact|privacy|terms|login|signup|register)$/i.test(description)) continue;

			if (!links.find((link) => link.url === fullUrl)) {
				links.push({ url: fullUrl, description });
				if (links.length >= maxLinks) break;
			}
		}

		return {
			text: text || fallbackHtmlToText(html),
			links,
		};
	} catch {
		return undefined;
	}
}

function clampMaxBytes(maxBytes?: number): number {
	if (!maxBytes) return DEFAULT_MAX_BYTES;
	return Math.max(1_000, Math.min(500_000, Math.floor(maxBytes)));
}

function clampTimeout(timeoutMs?: number): number {
	if (!timeoutMs) return 15_000;
	return Math.max(1_000, Math.min(120_000, Math.floor(timeoutMs)));
}

export default function webFetchExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_fetch",
		label: "Web Fetch",
		description: `Fetch a URL for lightweight docs lookup. Returns extracted text for HTML pages by default. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)} by default.`,
		promptSnippet: "Fetch docs pages from the web and return compact readable text",
		promptGuidelines: [
			"Use this tool when local files are insufficient and you need official docs/reference content.",
			"Prefer fetching specific pages instead of broad homepages.",
		],
		parameters: WebFetchParams,
		async execute(_toolCallId, params, signal) {
			const url = normalizeUrl(params.url);
			const timeoutMs = clampTimeout(params.timeoutMs);
			const maxBytes = clampMaxBytes(params.maxBytes);
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
			const abortHandler = () => controller.abort(signal?.reason ?? new Error("Aborted"));
			signal?.addEventListener("abort", abortHandler);

			try {
				const response = await fetch(url, {
					signal: controller.signal,
					redirect: "follow",
					headers: {
						"user-agent": "pi-web-fetch-extension/1.1",
						accept: "text/html, text/plain;q=0.9, */*;q=0.5",
					},
				});

				const contentType = response.headers.get("content-type") ?? "";
				const source = await response.text();
				const title = contentType.includes("text/html") ? extractTitle(source) : undefined;
				const requestedFormat = params.format ?? "auto";
				const isHtml = contentType.includes("text/html");
				const outputFormat: "text" | "html" = requestedFormat === "auto" ? "text" : requestedFormat;

				const readability =
					isHtml && outputFormat === "text"
						? await extractWithReadability(source, response.url, params.linkPatterns, params.maxLinks ?? 20)
						: undefined;

				const output =
					outputFormat === "html"
						? source
						: isHtml
							? readability?.text ?? fallbackHtmlToText(source)
							: source;

				const body = output.trim() || source.trim();
				const truncation = truncateHead(body, { maxLines: DEFAULT_MAX_LINES, maxBytes });

				const includeLinks = params.includeLinks ?? true;
				const links =
					includeLinks && isHtml
						? readability?.links ?? extractLinksFallback(source, response.url, params.linkPatterns, params.maxLinks ?? 20)
						: undefined;

				const details: WebFetchDetails = {
					url,
					finalUrl: response.url,
					status: response.status,
					contentType,
					format: outputFormat,
					truncated: truncation.truncated,
					responseBytes: Buffer.byteLength(source),
					title,
					links,
					extractor: readability ? "readability" : "fallback",
				};

				let text = truncation.content;
				if (truncation.truncated) {
					const tempDir = await mkdtemp(join(tmpdir(), "pi-web-fetch-"));
					const extension = outputFormat === "html" ? "html" : "txt";
					const fullOutputPath = join(tempDir, `response.${extension}`);
					await writeFile(fullOutputPath, body, "utf8");
					details.fullOutputPath = fullOutputPath;
					text += `\n\n[Output truncated: showing ${truncation.outputLines}/${truncation.totalLines} lines (${formatSize(truncation.outputBytes)}/${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
				}

				const header = [
					`URL: ${response.url}`,
					`Status: ${response.status}`,
					`Content-Type: ${contentType || "unknown"}`,
					title ? `Title: ${title}` : undefined,
					`Extractor: ${details.extractor}`,
					"",
				]
					.filter(Boolean)
					.join("\n");

				if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

				return {
					content: [{ type: "text", text: `${header}${text}` }],
					details,
				};
			} finally {
				clearTimeout(timeout);
				signal?.removeEventListener("abort", abortHandler);
			}
		},
	});
}
