#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readSessions } from "./sessions.mjs";

export function includeCodexActivity(output, sessions, now = Date.now()) {
  const newestFirst = [...sessions].sort((a, b) => b.modifiedAt - a.modifiedAt);
  return output.split("\n").map((line) => {
    if (!line || line.startsWith("#") || line.startsWith("SIZE\t")) return line;
    const fields = line.split("\t");
    if (fields.length !== 9) throw new Error("Unexpected worktree audit row; cleanup is unverified");
    const worktree = resolve(fields[8]);
    const session = newestFirst.find(({ cwd }) => cwd === worktree || cwd.startsWith(join(worktree, sep)));
    if (!session) return line;
    const day = new Date(session.modifiedAt).toISOString().slice(0, 10);
    if (fields[6] === "-" || day > fields[6]) fields[6] = day;
    if (now - session.modifiedAt <= 4 * 86400000 && ["safe", "review"].includes(fields[7])) {
      fields[7] = "verify-recent-chat";
    }
    return fields.join("\t");
  }).join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const script = fileURLToPath(new URL("../../../skills/poteto-mode/scripts/worktree-audit.sh", import.meta.url));
    const output = execFileSync("bash", [script, ...process.argv.slice(2)], {
      encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 16 * 1024 * 1024,
    });
    process.stdout.write(process.argv.some((arg) => ["-h", "--help"].includes(arg))
      ? output : includeCodexActivity(output, await readSessions()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
