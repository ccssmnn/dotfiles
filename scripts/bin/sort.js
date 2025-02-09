#!/usr/bin/env node

import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

async function sortLinesFromStdin() {
  let rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: false,
  });

  let lines = [];

  for await (let line of rl) {
    lines.push(line);
  }

  lines.sort((a, b) => {
    let aTrimmed = a.trimStart();
    let bTrimmed = b.trimStart();
    return aTrimmed.localeCompare(bTrimmed);
  });

  for (let line of lines) {
    console.log(line);
  }
}

sortLinesFromStdin()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("An error occurred:", err);
    process.exit(1);
  });
