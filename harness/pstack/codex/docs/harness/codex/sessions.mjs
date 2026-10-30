#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

async function* rollouts(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* rollouts(path);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) yield path;
  }
}

async function sessionMetadata(path) {
  const stream = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      const entry = JSON.parse(line);
      const payload = entry?.payload;
      if (entry?.type !== "session_meta" || typeof payload?.id !== "string" ||
          typeof payload?.cwd !== "string" || !isAbsolute(payload.cwd)) {
        throw new Error(`Invalid Codex session metadata: ${path}`);
      }
      const { mtimeMs } = await stat(path);
      return { id: payload.id, cwd: resolve(payload.cwd), path, modifiedAt: mtimeMs };
    }
    throw new Error(`Empty Codex rollout: ${path}`);
  } finally {
    lines.close();
    stream.destroy();
  }
}

export async function readSessions(home = process.env.CODEX_HOME || join(homedir(), ".codex")) {
  const sessions = [];
  for (const directory of ["sessions", "archived_sessions"]) {
    for await (const path of rollouts(join(home, directory))) sessions.push(await sessionMetadata(path));
  }
  return sessions.sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      cwd: { type: "string" }, id: { type: "string" }, home: { type: "string" },
    } });
    if (!values.cwd || !isAbsolute(values.cwd)) throw new Error("--cwd requires an absolute workspace path");
    const sessions = await readSessions(values.home);
    console.log(JSON.stringify(sessions.filter((session) =>
      session.cwd === resolve(values.cwd) && (!values.id || session.id === values.id)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
