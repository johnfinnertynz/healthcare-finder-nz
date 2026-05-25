import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const files = [
  "script.js",
  ...fs.readdirSync("tools")
    .filter((file) => file.endsWith(".mjs"))
    .map((file) => path.join("tools", file)),
  ...fs.readdirSync("tests")
    .filter((file) => file.endsWith(".mjs"))
    .map((file) => path.join("tests", file))
];

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || result.stdout || `Syntax check failed: ${file}`);
  }
}

if (failed) process.exit(1);
console.log(`Syntax checked ${files.length} JavaScript files.`);
