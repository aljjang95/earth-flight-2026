/// <reference types="vite/client" />

interface AceHarnessApi {
  version: string;
  heartbeat: () => Record<string, unknown>;
  getState: () => Record<string, unknown>;
  startQa: () => Promise<void>;
  skipPrologue: () => void;
  setSteer: (v: number) => void;
  setPitch: (v: number) => void;
  setThrottle: (v: number) => void;
  fire: (on: boolean) => void;
  missile: () => void;
  flare: () => void;
  getHp: () => number;
  getKills: () => number;
  theater: (id: string) => void;
  skill: () => void;
  potion: () => void;
  patches: () => string[];
}

interface Window {
  __ACE?: AceHarnessApi;
  __ACE_HEARTBEAT?: Record<string, unknown>;
  __controlsTest?: AceHarnessApi;
}

declare const Cesium: any;
