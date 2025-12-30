type Unlocks = {
  themes: string[];
  skins: string[];
  badges: string[];
};

export type ProgressionSaveV1 = {
  version: 1;
  totalXP: number;
};

export type ProgressionSaveV2 = {
  version: 2;
  totalXP: number;
  unlocks: Unlocks;
};

type ProgressionSaveRaw = Record<string, unknown> & {
  version?: number;
  totalXP?: number;
  unlocks?: unknown;
};

type ProgressionSave =
  | ProgressionSaveV1
  | ProgressionSaveV2
  | (Record<string, unknown> & { version: number; totalXP: number });

const STORAGE_KEY = "hh_progression";
const EMPTY_UNLOCKS: Unlocks = { themes: [], skins: [], badges: [] };

function coerceTotalXP(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function normalizeUnlocks(value: unknown): Unlocks {
  if (!value || typeof value !== "object") return { ...EMPTY_UNLOCKS };
  const v = value as Partial<Unlocks>;
  return {
    themes: Array.isArray(v.themes) ? v.themes.filter((item) => typeof item === "string") : [],
    skins: Array.isArray(v.skins) ? v.skins.filter((item) => typeof item === "string") : [],
    badges: Array.isArray(v.badges) ? v.badges.filter((item) => typeof item === "string") : [],
  };
}

function migrateProgression(raw: ProgressionSaveRaw): ProgressionSave {
  const version = Number((raw as { version?: number }).version);
  const safeVersion = Number.isFinite(version) && version > 0 ? version : 1;
  const totalXP = coerceTotalXP((raw as { totalXP?: number }).totalXP);

  if (safeVersion === 1) {
    return { ...raw, version: 1, totalXP };
  }

  if (safeVersion === 2) {
    const unlocks = normalizeUnlocks((raw as { unlocks?: unknown }).unlocks);
    return { ...raw, version: 2, totalXP, unlocks };
  }

  // Future versions: keep unknown fields, ensure totalXP is valid.
  return { ...raw, version: safeVersion, totalXP };
}

export function loadProgression(): ProgressionSaveV1 | ProgressionSaveV2 | (Record<string, unknown> & { version: number; totalXP: number }) {
  if (typeof window === "undefined") return { version: 1, totalXP: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, totalXP: 0 };
    const parsed = JSON.parse(raw) as ProgressionSaveRaw;
    if (!parsed || typeof parsed !== "object") return { version: 1, totalXP: 0 };
    return migrateProgression(parsed);
  } catch {
    return { version: 1, totalXP: 0 };
  }
}

export function saveProgression(save: ProgressionSave) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // ignore storage errors
  }
}

// Future migration placeholder for unlocks:
// Version 2 shape: { version: 2, totalXP, unlocks: { themes: [], skins: [], badges: [] } }
