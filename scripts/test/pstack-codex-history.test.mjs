import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { readSessions } from "../../pstack/docs/harness/codex/sessions.mjs";
import { includeCodexActivity } from "../../pstack/docs/harness/codex/worktree-audit.mjs";

const cli = fileURLToPath(new URL("../../pstack/docs/harness/codex/sessions.mjs", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pstack-codex-history-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace with spaces");
  const rollout = (relative, id, cwd, modifiedAt) => {
    const path = join(root, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ type: "session_meta", payload: { id, cwd } }) + "\nnot JSON; message bodies must not be parsed\n");
    utimesSync(path, modifiedAt / 1000, modifiedAt / 1000);
    return path;
  };
  const run = (...args) => spawnSync(process.execPath, [cli, "--home", root, ...args], { encoding: "utf8" });
  return { root, workspace, rollout, run };
}

test("session lookup scopes active and archived history to the exact workspace", (t) => {
  const f = fixture(t);
  const active = f.rollout("sessions/2026/10/01/active.jsonl", "active", f.workspace, 1000);
  const archived = f.rollout("archived_sessions/archived.jsonl", "archived", f.workspace, 2000);
  f.rollout("sessions/unrelated.jsonl", "unrelated", f.workspace + "-other", 3000);
  const result = f.run("--cwd", f.workspace);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).map(({ id, path }) => ({ id, path })), [
    { id: "archived", path: archived }, { id: "active", path: active },
  ]);
  assert.deepEqual(JSON.parse(f.run("--cwd", f.workspace, "--id", "active").stdout).map(({ id }) => id), ["active"]);
  assert.deepEqual(JSON.parse(f.run("--cwd", f.workspace, "--id", "unrelated").stdout), []);
});

test("missing history is empty but malformed metadata fails the lookup", async (t) => {
  const f = fixture(t);
  assert.deepEqual(await readSessions(f.root), []);
  const path = f.rollout("sessions/broken.jsonl", "broken", f.workspace, 1000);
  writeFileSync(path, JSON.stringify({ type: "session_meta", payload: { id: "broken" } }) + "\n");
  const result = f.run("--cwd", f.workspace);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid Codex session metadata/);
  assert.equal(result.stdout, "");
  assert.equal(f.run("--cwd", "relative/path").status, 1);
});

const row = (path, bucket = "safe", last = "-") => `1M\t9d\tYES\tclean\tpushed\t#1/merged\t${last}\t${bucket}\t${path}`;

test("recent Codex activity prevents cleanup without overriding work or PR holds", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const paths = ["/work/safe", "/work/review", "/work/wip", "/work/pr", "/work/old", "/work/unknown"];
  const buckets = ["safe", "review", "hold-wip", "hold-open-pr", "safe", "safe"];
  const output = "# base: main\nSIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE\n" +
    paths.map((path, i) => row(path, buckets[i])).join("\n") + "\n";
  const sessions = paths.slice(0, 5).map((cwd, i) => ({ cwd, modifiedAt: now - (i === 4 ? 5 : 1) * 86400000 }));
  const result = includeCodexActivity(output, sessions, now).trimEnd().split("\n").slice(2).map((line) => line.split("\t"));
  assert.deepEqual(result.map((fields) => fields[7]), ["verify-recent-chat", "verify-recent-chat", "hold-wip", "hold-open-pr", "safe", "safe"]);
  assert.deepEqual(result.map((fields) => fields[6]), ["2026-10-29", "2026-10-29", "2026-10-29", "2026-10-29", "2026-10-25", "-"]);
  assert.deepEqual(result.map((fields) => fields[8]), paths);
});

test("activity uses the newest matching session and includes the four-day boundary", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const sessions = [
    { cwd: "/work/repo", modifiedAt: now - 9 * 86400000 },
    { cwd: "/work/repo", modifiedAt: now - 4 * 86400000 },
    { cwd: "/work/older", modifiedAt: now - 4 * 86400000 - 1 },
  ];
  assert.match(includeCodexActivity(row("/work/repo"), sessions, now), /\tverify-recent-chat\t/);
  assert.match(includeCodexActivity(row("/work/older"), sessions, now), /\tsafe\t/);
  assert.match(includeCodexActivity(row("/work/repo", "safe", "2026-10-30"), sessions, now), /\t2026-10-30\tverify-recent-chat\t/);
  assert.throws(() => includeCodexActivity("unexpected output", sessions, now), /cleanup is unverified/);
});

test("activity in a worktree subdirectory protects its root without matching sibling prefixes", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  const sessions = [
    { cwd: "/work/feature", modifiedAt: now - 9 * 86400000 },
    { cwd: "/work/feature/apps/web", modifiedAt: now - 86400000 },
    { cwd: "/work/feature-other", modifiedAt: now },
    { cwd: "/work/sibling-other/apps", modifiedAt: now },
  ];
  const output = [row("/work/feature"), row("/work/sibling")].join("\n");
  const result = includeCodexActivity(output, sessions, now).split("\n");
  assert.equal(result[0], row("/work/feature", "verify-recent-chat", "2026-10-29"));
  assert.equal(result[1], row("/work/sibling"));
});
