#!/usr/bin/env node

import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

async function wrapWithTags() {
  let rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: false,
  });

  let inputData = "";
  let firstLineIndentation = "";
  let firstLineRead = false;

  for await (let line of rl) {
    if (!firstLineRead) {
      firstLineIndentation = line.match(/^\s*/)?.at(0) ?? "";
      firstLineRead = true;
    }
    inputData += line + "\n";
  }

  let taggedData = `${firstLineIndentation}<xxx>\n${inputData}\n${firstLineIndentation}</xxx>`;
  console.log(taggedData);
}

wrapWithTags()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("An error occurred:", err);
    process.exit(1);
  });
