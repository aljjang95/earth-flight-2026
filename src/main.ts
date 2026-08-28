import "./styles.css";
import { CAMPAIGN, CRAFTS, SUBTITLE, TITLE, VERSION, theaterById } from "./config";
import { G } from "./state";
import { audio } from "./audio";
import { initViewer, locationOptionsHtml, lookAtTheater, resizeViewer } from "./world";
import { bindHud } from "./hud";
import { bindGameKeys, exposeAceApi, returnToBase, startLoop, startMission } from "./game";
import { fireMissile, tryFlare, tryPotion, trySkill } from "./combat";
import { writeSave } from "./save";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function refreshStart(): void {
  const s = G.save;
  $("#startGold").textContent = String(s.gold);
  $("#startDia").textContent = String(s.diamonds);
  $("#startLevel").textContent = "Lv." + s.level;
  $("#startBest").textContent = "W" + s.bestWave + " · " + (s.totalKills || 0) + "K";
  const cleared = s.theatersCleared?.length || 0;
  const circ = $("#circuitProg");
  if (circ) circ.textContent = `${cleared}/${CAMPAIGN.length}`;
  renderCrafts();
}

function renderCrafts(): void {
  const row = $("#craftRow");
  if (!row) return;
  row.innerHTML = "";
  for (const c of CRAFTS) {
    const owned = G.save.owned.includes(c.id);
    const active = G.save.equipped === c.id;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "craft-card" + (active ? " active" : "");
    el.innerHTML =
      `<div class="cn">${c.name}</div><div class="cs">${c.role} · ${c.skillLabel}</div>` +
      `<div class="cp">${owned ? (active ? "출격 중" : "장착") : c.diamond ? c.diamond + " ◆" : c.gold.toLocaleString() + " G"}</div>`;
    el.onclick = () => {
      if (owned) {
        G.save.equipped = c.id;
        writeSave(G.save);
        renderCrafts();
      } else if (c.diamond && G.save.diamonds >= c.diamond) {
        G.save.diamonds -= c.diamond;
        G.save.owned.push(c.id);
        G.save.equipped = c.id;
        writeSave(G.save);
        refreshStart();
      } else if (!c.diamond && G.save.gold >= c.gold) {
        G.save.gold -= c.gold;
        G.save.owned.push(c.id);
        G.save.equipped = c.id;
        writeSave(G.save);
        refreshStart();
      } else {
        alert(c.diamond ? "다이아 부족" : "골드 부족");
      }
    };
    row.appendChild(el);
  }
}

function setMode(mode: "free" | "combat" | "campaign"): void {
  G.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.classList.toggle("active", (b as HTMLElement).dataset.mode === mode);
  });
}

async function runPrologue(): Promise<void> {
  const overlay = $("#prologue");
  const pText = $("#pText");
  const titleCard = $("#titleCard");
  const skip = $("#skipPrologue");
  if (new URLSearchParams(location.search).has("qa")) {
    await startMission();
    await audio.start();
    return;
  }
  overlay.classList.remove("hidden");
  skip.style.display = "block";
  let done = false;
  const finish = async () => {
    if (done) return;
    done = true;
    overlay.classList.add("hidden");
    skip.style.display = "none";
    await startMission();
    await audio.start();
  };
  skip.onclick = () => void finish();
  const t = theaterById(G.theaterId);
  try {
    G.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 22_000_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    });
    setTimeout(() => {
      G.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(t.lon, t.lat, 9200),
        orientation: { heading: t.heading, pitch: Cesium.Math.toRadians(-18), roll: 0 },
        duration: 8.5,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    }, 200);
  } catch {
    /* */
  }
  const steps = [
    { at: 300, text: "2047. 지구는 하나의 전장이 되었다." },
    { at: 2200, text: "적 전투기가 주요 도시를 봉쇄한다." },
    { at: 4200, text: `${t.name}. ${t.briefing}` },
    { at: 6800, text: "당신은 Ace. 하늘을 되찾아라." },
    { at: 8600, action: "title" as const },
    { at: 11200, action: "end" as const },
  ];
  let idx = 0;
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (done) {
        resolve();
        return;
      }
      const elapsed = now - t0;
      while (idx < steps.length && steps[idx].at <= elapsed) {
        const step = steps[idx++];
        if ("text" in step && step.text) {
          pText.textContent = step.text;
          pText.classList.remove("show");
          void pText.offsetWidth;
          pText.classList.add("show");
          titleCard.classList.remove("show");
        }
        if ("action" in step && step.action === "title") {
          pText.classList.remove("show");
          titleCard.classList.add("show");
        }
        if ("action" in step && step.action === "end") {
          void finish().then(resolve);
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function onTakeoff(): Promise<void> {
  const token = ($("ionToken") as HTMLInputElement).value.trim();
  G.ionToken = token;
  if (token) localStorage.setItem("cesium_ion_token", token);
  const loc = ($("locationSelect") as HTMLSelectElement).value;
  G.theaterId = loc;
  G.difficulty = parseFloat(($("diffSelect") as HTMLSelectElement).value) || 1;
  $("startBtn").setAttribute("disabled", "true");
  try {
    await runPrologue();
  } catch (err) {
    console.error(err);
    alert("이륙 실패: " + (err as Error).message);
    $("startOverlay").style.display = "flex";
  }
  $("startBtn").removeAttribute("disabled");
}

function wireUi(): void {
  $("verTag").textContent = "v" + VERSION;
  $("brandSub").textContent = SUBTITLE;
  ($("locationSelect") as HTMLSelectElement).innerHTML = locationOptionsHtml();
  const saved = localStorage.getItem("cesium_ion_token");
  if (saved) ($("ionToken") as HTMLInputElement).value = saved;

  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.addEventListener("click", () => setMode((b as HTMLElement).dataset.mode as "free" | "combat" | "campaign"));
  });
  setMode("campaign");

  $("locationSelect").addEventListener("change", () => {
    const id = ($("locationSelect") as HTMLSelectElement).value;
    G.theaterId = id;
    lookAtTheater(id, 520_000, 2.2);
    const t = theaterById(id);
    $("briefPreview").textContent = t.briefing || `${t.name} · 자유 비행 가능`;
  });

  $("buyPotion").addEventListener("click", () => {
    if (G.save.gold < 120) {
      alert("골드 부족");
      return;
    }
    G.save.gold -= 120;
    G.save.potions += 1;
    writeSave(G.save);
    refreshStart();
  });

  $("startBtn").addEventListener("click", () => void onTakeoff());
  $("resumeBtn").addEventListener("click", () => {
    G.paused = false;
    $("pauseMenu").style.display = "none";
  });
  $("pauseBaseBtn").addEventListener("click", () => {
    returnToBase();
    refreshStart();
  });
  $("retryBtn").addEventListener("click", () => {
    $("gameOver").style.display = "none";
    returnToBase();
    refreshStart();
  });
  $("cameraModeBtn").addEventListener("click", () => {
    const ev = new KeyboardEvent("keydown", { code: "KeyC" });
    window.dispatchEvent(ev);
  });
  $("muteBtn").addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    $("muteBtn").textContent = audio.muted ? "소리 켜기" : "음소거";
  });
  $("skillBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    trySkill();
  });
  $("potionBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    tryPotion();
  });
  $("missileBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    fireMissile(false);
  });
  $("flareBtn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    tryFlare();
  });

  window.addEventListener("resize", resizeViewer);
  window.addEventListener("orientationchange", () => setTimeout(resizeViewer, 200));
  visualViewport?.addEventListener("resize", resizeViewer);

  refreshStart();
  $("briefPreview").textContent = theaterById("seoul").briefing;
}

async function boot(): Promise<void> {
  const savedToken = localStorage.getItem("cesium_ion_token");
  if (savedToken) G.ionToken = savedToken;
  $("loadingMsg").textContent = "지구 궤도 진입 중...";
  await initViewer();
  bindHud();
  bindGameKeys();
  wireUi();
  startLoop();
  $("loading").classList.add("hidden");

  const qa = new URLSearchParams(location.search).has("qa") || new URLSearchParams(location.search).has("harness");
  if (qa) {
    $("harnessDock").classList.add("show");
    setMode("campaign");
    G.theaterId = "seoul";
    await startMission();
    await audio.start();
  }

  exposeAceApi(async () => {
    G.mode = "campaign";
    G.theaterId = "seoul";
    if (!G.flying) await startMission();
  });
}

void boot().catch((err) => {
  console.error(err);
  $("loadingMsg").textContent = "부트 실패: " + (err as Error).message;
});

document.title = `${TITLE} — ${SUBTITLE} v${VERSION}`;
