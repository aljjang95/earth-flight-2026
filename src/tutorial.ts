import { G } from "./state";
import { writeSave } from "./save";

const STEPS = [
  "A / D 로 선회하고 W / S 로 기수를 움직입니다.",
  "Space 기관포. HIT 마커가 뜨면 탄이 맞았습니다.",
  "M 미사일 · G 플레어. RWR이 켜지면 플레어를 뿌리세요.",
  "월드 서킷 18 전구. 타격·방어·엄호 임무를 완수하세요.",
];

let idx = 0;

function qaMode(): boolean {
  const q = new URLSearchParams(location.search);
  return q.has("qa") || q.has("harness");
}

function card(): HTMLElement | null {
  return document.getElementById("tutorial");
}

function textEl(): HTMLElement | null {
  return document.getElementById("tutText");
}

function render(): void {
  const t = textEl();
  if (t) t.textContent = STEPS[idx] || "";
  const next = document.getElementById("tutNext");
  if (next) next.textContent = idx >= STEPS.length - 1 ? "출격" : "다음";
}

function finish(): void {
  G.tutorial = false;
  G.save.tutorialDone = true;
  writeSave(G.save);
  const el = card();
  if (el) el.style.display = "none";
}

export function bindTutorial(): void {
  document.getElementById("tutNext")?.addEventListener("click", () => {
    if (idx >= STEPS.length - 1) {
      finish();
      return;
    }
    idx += 1;
    render();
  });
  document.getElementById("tutSkip")?.addEventListener("click", () => finish());
}

export function maybeStartTutorial(): void {
  if (qaMode() || G.save.tutorialDone || G.mode === "free") {
    G.tutorial = false;
    const el = card();
    if (el) el.style.display = "none";
    return;
  }
  idx = 0;
  G.tutorial = true;
  render();
  const el = card();
  if (el) el.style.display = "flex";
}

export function takePhoto(): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const flash = document.getElementById("photoFlash");
  const label = document.getElementById("photoLabel");
  if (label) label.textContent = `SNAPSHOT  ${stamp.slice(0, 19)}`;
  if (flash) {
    flash.classList.add("show");
    setTimeout(() => flash.classList.remove("show"), 1400);
  }
  try {
    const cvs = G.viewer?.scene?.canvas as HTMLCanvasElement | undefined;
    if (!cvs) return;
    const url = cvs.toDataURL("image/jpeg", 0.82);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ace-horizon-${stamp}.jpg`;
    a.click();
  } catch {
    /* cross-origin globe tiles may taint the canvas — overlay still confirms the shot */
  }
}

export function showCredits(on: boolean): void {
  const el = document.getElementById("creditsOverlay");
  if (el) el.style.display = on ? "flex" : "none";
}
