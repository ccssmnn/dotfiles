#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import * as readline from "node:readline";
import { stdin } from "node:process";

import * as dotenv from "dotenv";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

async function ai() {
  readEnvFromLocalFile();
  let input = await readLinesFromStdin();
  let files = await readFilesFromArgs();
  let aiResponse = await generateText({
    model: google("gemini-2.0-flash"),
    prompt: `
You are a code assistant that helps developers improve their code. You receive an input that needs to be replaced, and your task is to suggest a replacement.

Some rules to follow:
- prefer let over const for variable declaration
- prefer function example() {} over const example = () => {}
- avoid comments in the code when descriptive variable names are sufficient

You will be provided with relevant files from the codebase to provide context. Pay close attention to the file paths and contents to understand the surrounding code. If you find any TODO: comments treat them as instructions and replace them with an "AI: eplaining the reasoning" comment where the developer can see what the reasoning behind the change was.

Files for context:
${files.map(({ path, file }) => `File: ${path}\n${file}\n`).join("")}

Input to be replaced:
${input}

Final note:
It is important that you only respond with text that can directly replace the input, without any surrounding code fences or explanations.
`,
  });
  if (!aiResponse.text) {
    console.log(`// ERROR: the model returned an empty string\n${input}`);
  } else {
    console.log(removeCodeFence(aiResponse.text));
  }
}

ai()
  .then(() => {
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("An error occurred:", err);
    process.exit(1);
  });

async function readLinesFromStdin() {
  let lines = [];
  let rl = readline.createInterface({ input: stdin });
  for await (let line of rl) {
    lines.push(line);
  }
  return lines.join("\n");
}

async function readFilesFromArgs() {
  let args = process.argv.slice(2);
  let files = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] !== "-f") continue;

    let path = args[i + 1];
    if (!path) break;

    let file = await fs.readFile(path, { encoding: "utf-8" });
    files.push({ path, file });
    i++;
  }

  return files;
}

function readEnvFromLocalFile() {
  let __filename = fileURLToPath(import.meta.url);
  let envPath = resolve(dirname(__filename), "..", ".env");
  dotenv.config({ path: envPath });
}

/** @param {string} response */
function removeCodeFence(response) {
  let codeFenceRegex = /```[a-zA-Z]*\n([\s\S]*?)```/g;

  let match = codeFenceRegex.exec(response);
  if (match) return match[1];

  return response;
}
