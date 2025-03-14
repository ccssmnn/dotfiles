import { createInterface } from "node:readline";
import { stdin } from "node:process";

let rl = createInterface({ input: stdin });

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
