#!/usr/bin/env node
/**
 * Grok 4.7 product harness — Orchestrator
 * Static self-improvement QA against the world-combat web game.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = join(root, "harness", "state");
mkdirSync(stateDir, { recursive: true });

function read(p) {
  return readFileSync(join(root, p), "utf8");
}

function srcFiles() {
  const dir = join(root, "src");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({ name: f, text: readFileSync(join(dir, f), "utf8") }));
}

const findings = [];
function check(id, ok, detail) {
  findings.push({ id, ok: !!ok, detail });
}

const files = srcFiles();
const all = files.map((f) => f.text).join("\n");
const game = files.find((f) => f.name === "game.ts")?.text || "";
const html = read("index.html");
const pkg = JSON.parse(read("package.json"));
const version = read("VERSION").trim();
const prd = existsSync(join(root, "prd/world-combat.md")) ? read("prd/world-combat.md") : "";

check("version-sync", pkg.version === version && version.startsWith("2.1"), `pkg=${pkg.version} VERSION=${version}`);
check("no-counter-template", !existsSync(join(root, "src/counter.ts")), "Vite counter leftover removed");
check(
  "theaters-16",
  all.includes('id: "sydney"') &&
    all.includes('id: "seoul"') &&
    all.includes('id: "moscow"') &&
    all.includes('id: "capetown"') &&
    all.includes('id: "hk"'),
  "16-theater world circuit",
);
check("enemy-guns", all.includes("fireEnemyGun"), "enemy cannon tracers");
check("enemy-missiles", all.includes("fireEnemyMissile"), "enemy missiles");
check("flares", all.includes("tryFlare") && html.includes("flareBtn"), "player flares / RWR");
check("campaign-transit", all.includes("transitCinematic") && all.includes("CAMPAIGN"), "world circuit transit");
check("jet-gltf", all.includes("jetModelUri") && all.includes("addLoft"), "lofted fighter mesh");
check("missile-mesh", all.includes("missileModelUri"), "visible missile dart");
check("adaptive-quality", all.includes("applyQuality") && all.includes("proposePatches"), "fps + self-improve quality");
check("heartbeat", all.includes("__ACE_HEARTBEAT") && all.includes("tickHarness") && all.includes("supervisorBeats"), "in-game supervisor heartbeat");
check("self-improve", all.includes("proposePatches") && all.includes("patchGen") && existsSync(join(root, "src/selfImprove.ts")), "self-improvement loop");
check("exhaust", all.includes("scaleByDistance") && all.includes("playerExhaust"), "afterburner exhaust");
check("wreckage", all.includes("fallT"), "falling wreckage");
check("cancel-flight", all.includes("cancelFlight"), "theater chip cancels globe fly");
check("no-double-fire", !game.includes('if (e.code === "KeyM")'), "missile not double-bound on keydown");
check("chase-cam", all.includes("Cartesian3(-dist, 0, height)"), "centered Ace Combat chase cam");
check("no-token-required", html.includes("없으면 위성") || all.includes("esriLayer"), "playable without ion token");
check("mode-buttons-isolated", html.includes("mode-play") && !html.includes('class="mode-btn"'), "shop buttons no longer steal game mode");
check("hud-canvas", html.includes("hudCanvas") && all.includes("drawHud"), "Ace Combat HUD canvas");
check("prd", prd.includes("월드 서킷") && prd.includes("16"), "PRD aligned with 16-theater circuit");
check("qa-hook", all.includes("__ACE") && html.includes("src/main.ts"), "dogfood API + Vite entry");
check("spawn-protect", all.includes("spawnProtect") && all.includes("MERGE SAFE"), "spawn protection + HUD cue");
check("software-gl", all.includes("isSoftwareRenderer") && all.includes("bootQuality"), "software GL quality boot");
check("hangar-lock", all.includes("mission-live") && all.includes("syncMissionChrome"), "QA hangar overlay cannot cover combat");
check("improve-fast", all.includes("IMPROVE_INTERVAL") && all.includes("FPS_QUALITY_FLOOR"), "self-improve ticks on FPS floor");

const pass = findings.every((f) => f.ok);
const report = {
  t: Date.now(),
  iso: new Date().toISOString(),
  orchestrator: "self-improve",
  pass,
  findings,
  nextPatches: pass
    ? ["browser dogfood: hangar globe, theater chips, takeoff, gun, missile, flare, transit"]
    : findings.filter((f) => !f.ok).map((f) => `fix:${f.id}`),
};

writeFileSync(join(stateDir, "qa-report.json"), JSON.stringify(report, null, 2));
writeFileSync(join(stateDir, "orch.json"), JSON.stringify({ t: Date.now(), alive: true, pass }, null, 2));
console.log(pass ? "ORCH PASS" : "ORCH FAIL");
for (const f of findings) console.log(`${f.ok ? "  ok" : "FAIL"} ${f.id} — ${f.detail}`);
process.exit(pass ? 0 : 1);
