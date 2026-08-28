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
const html = read("index.html");
const pkg = JSON.parse(read("package.json"));
const version = read("VERSION").trim();
const major = parseInt(version.split(".")[0], 10);

check("version-sync", pkg.version === version && major >= 3, `pkg=${pkg.version} VERSION=${version}`);
check("no-counter-template", !existsSync(join(root, "src/counter.ts")), "Vite counter leftover removed");
check("theaters-12", (all.match(/id: "sydney"/) && all.match(/id: "seoul"/) && (all.match(/id: "/g) || []).length >= 12), "world theaters present");
check("enemy-guns", all.includes("fireEnemyGun"), "enemy cannon tracers");
check("enemy-missiles", all.includes("fireEnemyMissile"), "enemy missiles");
check("flares", all.includes("tryFlare") && html.includes("flareBtn"), "player flares / RWR");
check("campaign-transit", all.includes("transitCinematic") && all.includes("CAMPAIGN"), "world circuit transit");
check("jet-gltf", all.includes("jetModelUri") && all.includes("addLoft"), "lofted fighter mesh");
check("missile-mesh", all.includes("missileModelUri"), "visible missile dart");
check("adaptive-quality", all.includes("applyQuality"), "fps adaptive globe quality");
check("heartbeat", all.includes("__ACE_HEARTBEAT") && all.includes("tickHarness"), "in-game supervisor heartbeat");
check("no-token-required", html.includes("없으면 위성") || all.includes("esriLayer"), "playable without ion token");
check("mode-buttons-isolated", html.includes("mode-play") && !html.includes('class="mode-btn"'), "shop buttons no longer steal game mode");
check("hud-canvas", html.includes("hudCanvas") && all.includes("drawHud"), "Ace Combat HUD canvas");
check("qa-hook", all.includes("__ACE") && html.includes("src/main.ts"), "dogfood API + Vite entry");
check("wingman", all.includes("spawnWingman") && all.includes("updateWingman") && all.includes("fireWingmanGun"), "friendly GHOST-1 wingman");
check("theater-mood", all.includes("applyTheaterMood"), "theater weather / time of day");
check("gfx-select", html.includes("gfxSelect") && all.includes("G.save.quality"), "hangar graphics preset");
check("hit-mark", all.includes("hitMark"), "gun HIT marker");
check("campaign-18", all.includes('id: "moscow"') && all.includes('id: "vancouver"') && all.includes('id: "nairobi"') && all.includes('id: "mumbai"') && all.includes('id: "rome"') && all.includes('id: "berlin"'), "18-theater world circuit");
check("strike-grounds", all.includes("spawnGroundTargets") && all.includes("GroundTarget"), "strike ground targets");
check("defend-city", all.includes("spawnCityDefense") && all.includes("damageCity"), "defend city HP");
check("escort-hunt", all.includes('"wingman"') && all.includes("killWingman"), "escort wingman hunters");
check("medals", all.includes("medals") && html.includes("startMedals"), "theater medals");
check("tutorial", html.includes("id=\"tutorial\"") && all.includes("maybeStartTutorial") && all.includes("tutorialDone"), "first-flight tutorial");
check("pause-photo", html.includes("photoBtn") && all.includes("takePhoto"), "pause snapshot");
check("credits", html.includes("creditsOverlay") && all.includes("showCredits"), "credits overlay");
check("sortie-card", html.includes("sortieCard") && all.includes("showSortieCard"), "sortie briefing card");
check("ghost-pair", all.includes("GHOST-2") && all.includes("GHOST-1 / GHOST-2"), "visible two-ship wing");
check("qa-missions", all.includes('key === "strike"') && all.includes('"nairobi"'), "qa=strike/defend/escort boot");

const pass = findings.every((f) => f.ok);
const report = {
  t: Date.now(),
  iso: new Date().toISOString(),
  orchestrator: "self-improve",
  pass,
  findings,
  nextPatches: pass
    ? ["browser dogfood: takeoff, merge, gun, missile, flare, theater transit"]
    : findings.filter((f) => !f.ok).map((f) => `fix:${f.id}`),
};

writeFileSync(join(stateDir, "qa-report.json"), JSON.stringify(report, null, 2));
writeFileSync(join(stateDir, "orch.json"), JSON.stringify({ t: Date.now(), alive: true, pass }, null, 2));
console.log(pass ? "ORCH PASS" : "ORCH FAIL");
for (const f of findings) console.log(`${f.ok ? "  ok" : "FAIL"} ${f.id} — ${f.detail}`);
process.exit(pass ? 0 : 1);
