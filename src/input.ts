import { G } from "./state";

export const keys = new Set<string>();
export const input = {
  stickSteer: 0,
  stickPitch: 0,
  mouseSteer: 0,
  mousePitch: 0,
  mouseHeld: false,
  touchThrottle: 0,
  firing: false,
  skillHeld: false,
  potionHeld: false,
  flareHeld: false,
  missileHeld: false,
};

export function bindInput(once: { bound: boolean }): void {
  if (once.bound) return;
  once.bound = true;

  const GAME = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyQ",
    "KeyE",
    "KeyF",
    "KeyR",
    "KeyM",
    "KeyG",
    "Digit1",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ShiftLeft",
    "ShiftRight",
    "ControlLeft",
    "ControlRight",
    "KeyC",
    "Space",
    "KeyP",
    "Escape",
  ]);

  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (GAME.has(e.code)) e.preventDefault();
    if (e.code === "Space") input.firing = true;
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    if (e.code === "Space") input.firing = false;
  });
  window.addEventListener("blur", () => {
    keys.clear();
    input.firing = false;
  });

  const stickEl = document.getElementById("stick")!;
  const stickKnob = document.getElementById("stickKnob")!;
  let stickActive = false;
  let stickPointerId: number | null = null;

  const applyStick = (cx: number, cy: number) => {
    const r = stickEl.getBoundingClientRect();
    const mx = r.left + r.width / 2;
    const my = r.top + r.height / 2;
    const dx = cx - mx;
    const dy = cy - my;
    const max = r.width * 0.34;
    const mag = Math.hypot(dx, dy);
    const nx = mag > max ? (dx / mag) * max : dx;
    const ny = mag > max ? (dy / mag) * max : dy;
    stickKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    let s = Math.max(-1, Math.min(1, nx / max));
    let p = Math.max(-1, Math.min(1, -ny / max));
    if (Math.abs(s) < 0.15) s = 0;
    if (Math.abs(p) < 0.15) p = 0;
    input.stickSteer = s;
    input.stickPitch = p;
  };

  stickEl.addEventListener("pointerdown", (e) => {
    stickActive = true;
    stickPointerId = e.pointerId;
    try {
      stickEl.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    e.preventDefault();
    applyStick(e.clientX, e.clientY);
  });
  stickEl.addEventListener("pointermove", (e) => {
    if (stickActive && (stickPointerId == null || e.pointerId === stickPointerId)) applyStick(e.clientX, e.clientY);
  });
  const endStick = (e?: PointerEvent) => {
    if (e && stickPointerId != null && e.pointerId !== stickPointerId) return;
    stickActive = false;
    stickPointerId = null;
    stickKnob.style.transform = "translate(-50%, -50%)";
    input.stickSteer = 0;
    input.stickPitch = 0;
    input.mouseSteer = 0;
    input.mousePitch = 0;
  };
  stickEl.addEventListener("pointerup", endStick);
  stickEl.addEventListener("pointercancel", endStick);
  window.addEventListener("pointerup", (e) => {
    if (stickActive) endStick(e);
  });

  const canvas = G.viewer.scene.canvas as HTMLCanvasElement;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    input.mouseSteer = Math.max(-1, Math.min(1, input.mouseSteer + dx * 0.004));
    input.mousePitch = Math.max(-1, Math.min(1, input.mousePitch - dy * 0.004));
    input.mouseHeld = true;
  });
  const endDrag = () => {
    dragging = false;
    input.mouseHeld = false;
    input.mouseSteer = 0;
    input.mousePitch = 0;
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  const bindThr = (el: HTMLElement | null, val: number) => {
    if (!el) return;
    const down = (e: Event) => {
      e.preventDefault();
      input.touchThrottle = val;
    };
    const up = () => {
      input.touchThrottle = 0;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
  };
  bindThr(document.getElementById("thrUp"), 0.9);
  bindThr(document.getElementById("thrDown"), -0.9);

  const fireBtn = document.getElementById("fireBtn");
  fireBtn?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    input.firing = true;
  });
  fireBtn?.addEventListener("pointerup", () => {
    input.firing = false;
  });
  fireBtn?.addEventListener("pointercancel", () => {
    input.firing = false;
  });
  fireBtn?.addEventListener("pointerleave", () => {
    input.firing = false;
  });
}

export function readStick(): { rollCmd: number; pitchCmd: number } {
  let rollCmd = input.stickSteer + input.mouseSteer;
  let pitchCmd = input.stickPitch + input.mousePitch;
  if (keys.has("KeyD") || keys.has("ArrowRight")) rollCmd += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) rollCmd -= 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) pitchCmd += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) pitchCmd -= 1;

  try {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const lx = pad.axes[0] ?? 0;
      const ly = pad.axes[1] ?? 0;
      const mag = Math.hypot(lx, ly);
      if (mag > 0.22) {
        const scale = (mag - 0.22) / 0.78 / mag;
        rollCmd += lx * scale;
        pitchCmd += -ly * scale;
      }
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      G.player.throttle = Math.max(0, Math.min(1, G.player.throttle + (rt - lt) * 0.7 * 0.016));
      if (pad.buttons[0]?.pressed) input.firing = true;
      break;
    }
  } catch {
    /* */
  }

  rollCmd = Math.max(-1, Math.min(1, rollCmd));
  pitchCmd = Math.max(-1, Math.min(1, pitchCmd));
  return { rollCmd, pitchCmd };
}
