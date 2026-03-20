import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const OpenAI = require("openai").default as typeof import("openai").default;

const exec = promisify(execFile);

const maxSummaryLength = 140;

const ttsPreferences = {
  soundPath: "/System/Library/Sounds/Purr.aiff",
  openAiVoice: "ash" as const,
  openAiTtsModel: "gpt-4o-mini-tts" as const,
  openAiTtsSpeed: 1.5,
  summaryModel: "gpt-5.4-nano",
  fallbackVoice: "Samantha",
};

type HookInput = {
  session_id?: string;
  cwd?: string;
  last_assistant_message?: string;
};

function openAiClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function projectNameFrom(cwd?: string) {
  if (!cwd) return "project";
  return basename(cwd) || "project";
}

function cleanMarkdown(value: string) {
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
  const cleaned = cleanMarkdown(value);
  if (!cleaned) return "task ready";

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return truncate(firstSentence, maxSummaryLength);
}

async function generateSummary(client: InstanceType<typeof OpenAI> | null, value: string) {
  const cleaned = cleanMarkdown(value);

  if (!cleaned) return "task ready";
  if (!client) return buildSummary(cleaned);

  try {
    const response = await client.chat.completions.create({
      model: ttsPreferences.summaryModel,
      messages: [
        {
          role: "system",
          content:
            "Write a short spoken summary for a coding task completion announcement. Return one sentence, under 18 words, plain text only.",
        },
        { role: "user", content: cleaned.slice(0, 4000) },
      ],
      max_tokens: 40,
    });

    const summary = response.choices[0]?.message?.content?.trim();
    return summary
      ? truncate(cleanMarkdown(summary), maxSummaryLength)
      : buildSummary(cleaned);
  } catch {
    return buildSummary(cleaned);
  }
}

async function playSound() {
  await exec("afplay", [ttsPreferences.soundPath]).catch(() => {});
}

async function speakWithOpenAi(client: InstanceType<typeof OpenAI>, phrase: string) {
  const response = await client.audio.speech.create({
    model: ttsPreferences.openAiTtsModel,
    voice: ttsPreferences.openAiVoice,
    speed: ttsPreferences.openAiTtsSpeed,
    input: phrase,
    response_format: "mp3",
  });

  const filePath = join(tmpdir(), `claude-tts-${Date.now()}.mp3`);
  try {
    const audio = Buffer.from(await response.arrayBuffer());
    await writeFile(filePath, audio);
    await exec("afplay", [filePath]);
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

async function speakWithSystemVoice(phrase: string) {
  await exec("say", ["-v", ttsPreferences.fallbackVoice, phrase]).catch(
    () => {}
  );
}

async function announce(client: InstanceType<typeof OpenAI> | null, phrase: string) {
  await playSound();

  if (client) {
    try {
      await speakWithOpenAi(client, phrase);
      return;
    } catch {}
  }

  await speakWithSystemVoice(phrase);
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input: HookInput = JSON.parse(Buffer.concat(chunks).toString());

  const client = openAiClient();
  const projectName = projectNameFrom(input.cwd);
  const message = input.last_assistant_message;
  const summary = message
    ? await generateSummary(client, message)
    : "task ready";

  await announce(client, `${projectName}. ${summary}`);
}

main();
