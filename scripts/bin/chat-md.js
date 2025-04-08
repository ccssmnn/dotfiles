#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

await readLocalEnvFile();

let filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: chat-md <path-to-md>");
  process.exit(1);
}

filePath = resolve(process.cwd(), filePath);

let markdown = await readFile(filePath, "utf-8");

let messages = extractMessages(markdown);

if (!messages.length || messages.at(-1)?.role !== "user") {
  console.error(
    "Last message must be from user (end with '## User' section). Appending one...",
  );
  markdown += "\n\n## User\n<type your message here>\n";
  await writeFile(filePath, markdown, "utf-8");
  process.exit(1);
}

let aiResponse = await generateText({
  model: google("gemini-2.0-flash"),
  messages,
});

if (!aiResponse.text?.trim()) {
  console.error("Empty response from model");
  process.exit(1);
}

let updated =
  markdown.trim() +
  "\n\n## Assistant\n" +
  aiResponse.text.trim() +
  "\n\n## User\n";
await writeFile(filePath, updated, "utf-8");

/**
 * @param {string} markdown
 * @returns {Array<import("ai").CoreMessage>}
 */
function extractMessages(markdown) {
  const lines = markdown.split("\n");
  /** @type {Array<import("ai").CoreMessage>} */
  const messages = [];

  /** @type {import("ai").CoreMessage["role"] | null} */
  let currentRole = null;
  let currentContent = [];

  for (let line of lines) {
    if (line.trim().toLowerCase() === "## user") {
      if (currentRole && currentContent.length) {
        messages.push({
          role: currentRole,
          content: currentContent.join("\n").trim(),
        });
      }
      currentRole = "user";
      currentContent = [];
    } else if (line.trim().toLowerCase() === "## assistant") {
      if (currentRole && currentContent.length) {
        messages.push({
          role: currentRole,
          content: currentContent.join("\n").trim(),
        });
      }
      currentRole = "assistant";
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentRole && currentContent.length) {
    messages.push({
      role: currentRole,
      content: currentContent.join("\n").trim(),
    });
  }

  return messages;
}

async function readLocalEnvFile() {
  let __filename = fileURLToPath(import.meta.url);
  let envPath = resolve(dirname(__filename), "..", ".env");

  try {
    let envFile = await readFile(envPath, { encoding: "utf-8" });
    envFile.split("\n").forEach((line) => {
      let [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch {
    // ignore
  }
}
