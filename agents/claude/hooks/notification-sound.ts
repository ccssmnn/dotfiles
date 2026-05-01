import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const soundPath = "/System/Library/Sounds/Purr.aiff";

async function main() {
  await exec("afplay", [soundPath]).catch(() => {});
}

main();
