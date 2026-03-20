import { tool, type Plugin } from "@opencode-ai/plugin";

const braveSearchArgs = {
  query: tool.schema.string().min(1).describe("Search query"),
  count: tool.schema
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Results to return, 1-20"),
  country: tool.schema
    .string()
    .length(2)
    .optional()
    .describe("2-letter country code, ex: us or de"),
  search_lang: tool.schema
    .string()
    .optional()
    .describe("Language code, ex: en or de"),
  safesearch: tool.schema.enum(["off", "moderate", "strict"]).optional(),
  freshness: tool.schema.enum(["pd", "pw", "pm", "py"]).optional(),
};

type BraveResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
};

type BraveResponse = {
  web?: {
    results?: BraveResult[];
  };
};

function getApiKey() {
  return process.env.BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_API_KEY;
}

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function clampCount(count: number | undefined) {
  return Math.max(1, Math.min(20, Math.floor(count ?? 8)));
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function formatResult(result: Required<Pick<BraveResult, "title" | "url">> & BraveResult, index: number) {
  const lines = [`${index + 1}. ${result.title}`, `   URL: ${result.url}`];

  if (result.description) lines.push(`   Snippet: ${result.description}`);
  if (result.age) lines.push(`   Age: ${result.age}`);

  return lines.join("\n");
}

export const BraveWebSearchPlugin: Plugin = async () => {
  return {
    tool: {
      web_search: tool({
        description: "Search the web with Brave Search and return ranked results.",
        args: braveSearchArgs,
        async execute(args, context) {
          const apiKey = getApiKey();

          if (!apiKey) {
            throw new Error("Missing Brave API key. Set BRAVE_SEARCH_API_KEY or BRAVE_API_KEY.");
          }

          const count = clampCount(args.count);
          const query = new URLSearchParams({
            q: args.query,
            count: String(count),
            ...(args.country ? { country: args.country } : {}),
            ...(args.search_lang ? { search_lang: args.search_lang } : {}),
            ...(args.safesearch ? { safesearch: args.safesearch } : {}),
            ...(args.freshness ? { freshness: args.freshness } : {}),
          });

          const endpoint = `https://api.search.brave.com/res/v1/web/search?${query.toString()}`;
          const response = await fetch(endpoint, {
            signal: context.abort,
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip",
              "X-Subscription-Token": apiKey,
            },
          });

          const body = await response.text();

          if (!response.ok) {
            throw new Error(`Brave API error: ${response.status} ${response.statusText}\n${body.slice(0, 800)}`);
          }

          const data = JSON.parse(body) as BraveResponse;
          const results = (data.web?.results ?? [])
            .map((result) => ({
              title: cleanText(result.title) || "Untitled",
              url: String(result.url ?? "").trim(),
              description: cleanText(result.description),
              age: cleanText(result.age),
            }))
            .filter((result) => result.url)
            .slice(0, count);

          context.metadata({
            title: `web_search ${truncate(args.query, 48)}`,
            metadata: {
              provider: "brave",
              query: args.query,
              count: results.length,
            },
          });

          if (results.length === 0) {
            return `No Brave results for: ${args.query}`;
          }

          return [`Query: ${args.query}`, `Results: ${results.length}`, "", ...results.map(formatResult)].join("\n");
        },
      }),
    },
  };
};
