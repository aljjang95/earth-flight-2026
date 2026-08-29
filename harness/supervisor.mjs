#!/usr/bin/env node
/**
 * Grok 4.7 product harness — Supervisor
 * Heartbeats the orchestrator and keeps the self-improvement loop alive.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = join(root, "harness", "state");
mkdirSync(stateDir, { recursive: true });

const once = process.argv.includes("--once");
const INTERVAL = 4000;

function beat(extra = {}) {
  const payload = {
    t: Date.now(),
    iso: new Date().toISOString(),
    supervisor: "alive",
    orchestrator: extra.orch || "pending",
    loop: "self-improve",
    product: "earth-flight-world-combat",
    version: readVersion(),
    ...extra,
  };
  writeFileSync(join(stateDir, "heartbeat.json"), JSON.stringify(payload, null, 2));
  writeFileSync(
    join(stateDir, "supervisor.log"),
    `[${payload.iso}] heartbeat supervisor=alive orch=${payload.orchestrator}\n`,
    { flag: "a" },
  );
  return payload;
}

function readVersion() {
  try {
    return readFileSync(join(root, "VERSION"), "utf8").trim();
  } catch {
    return "unknown";
  }
}

function runOrchestrator() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, "harness", "orchestrator.mjs"), "--once"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      out += d;
    });
    child.on("close", (code) => {
      resolve({ code, out });
    });
  });
}

async function tick() {
  beat({ orch: "running" });
  const result = await runOrchestrator();
  let qa = {};
  const reportPath = join(stateDir, "qa-report.json");
  if (existsSync(reportPath)) {
    try {
      qa = JSON.parse(readFileSync(reportPath, "utf8"));
    } catch {
      qa = {};
    }
  }
  beat({
    orch: result.code === 0 ? "ok" : "fail",
    exit: result.code,
    findings: qa.findings?.length ?? null,
    pass: qa.pass ?? null,
  });
  if (once) process.exit(result.code === 0 ? 0 : 1);
}

await tick();
if (!once) {
  setInterval(() => {
    void tick();
  }, INTERVAL);
  console.log("supervisor heartbeat loop on", INTERVAL, "ms");
}
