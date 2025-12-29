import { Difficulty, ModifierType, Tile } from "./types";

export const BOARD_SIZE = 11;
export const RACK_SIZE = 7;

export const CENTER = {
  x: Math.floor(BOARD_SIZE / 2),
  y: Math.floor(BOARD_SIZE / 2),
};

// Tunable: counts of each modifier per match
export const MODIFIER_COUNTS: Record<Exclude<ModifierType, null>, number> = {
  DL: 12,
  TL: 5,
  DW: 6,
  TW: 3,
  EVIL_LETTER: 5,
  EVIL_WORD: 3,
};

// Simple Scrabble-ish letter values (trimmed / tweak as desired)
export const LETTER_VALUES: Record<string, number> = {
  A: 1, E: 1, I: 1, O: 1, R: 1, S: 1, T: 1,
  D: 2, N: 2, L: 2, U: 2,
  H: 3, G: 3, Y: 3,
  B: 4, C: 4, F: 4, M: 4, P: 4, W: 4,
  V: 5, K: 5,
  X: 8,
  J: 10, Q: 10, Z: 10,
};

type DistributionEntry = {
  letter: string;
  count: number;
  value: number;
  isBlank?: boolean;
};

const BASE_DISTRIBUTION: DistributionEntry[] = [
  { letter: "?", count: 2, value: 0, isBlank: true },
  { letter: "A", count: 9, value: 1 },
  { letter: "E", count: 13, value: 1 },
  { letter: "I", count: 8, value: 1 },
  { letter: "O", count: 8, value: 1 },
  { letter: "R", count: 6, value: 1 },
  { letter: "S", count: 5, value: 1 },
  { letter: "T", count: 7, value: 1 },
  { letter: "D", count: 5, value: 2 },
  { letter: "N", count: 5, value: 2 },
  { letter: "L", count: 4, value: 2 },
  { letter: "U", count: 4, value: 2 },
  { letter: "H", count: 4, value: 3 },
  { letter: "G", count: 3, value: 3 },
  { letter: "Y", count: 2, value: 3 },
  { letter: "B", count: 2, value: 4 },
  { letter: "C", count: 2, value: 4 },
  { letter: "F", count: 2, value: 4 },
  { letter: "M", count: 2, value: 4 },
  { letter: "P", count: 2, value: 4 },
  { letter: "W", count: 2, value: 4 },
  { letter: "V", count: 2, value: 5 },
  { letter: "K", count: 1, value: 5 },
  { letter: "X", count: 1, value: 8 },
  { letter: "J", count: 1, value: 10 },
  { letter: "Q", count: 1, value: 10 },
  { letter: "Z", count: 1, value: 10 },
];

const BASE_TOTAL = BASE_DISTRIBUTION.reduce((sum, entry) => sum + entry.count, 0);

const TARGET_TILE_COUNT: Record<Difficulty, number> = {
  easy: 64,
  normal: 84,
  hard: BASE_TOTAL,
};

function scaleDistribution(targetTotal: number): DistributionEntry[] {
  const fixed = BASE_DISTRIBUTION.filter((entry) => entry.count <= 2);
  const variable = BASE_DISTRIBUTION.filter((entry) => entry.count > 2);
  const fixedTotal = fixed.reduce((sum, entry) => sum + entry.count, 0);
  const variableTotal = variable.reduce((sum, entry) => sum + entry.count, 0);
  const desiredVariable = Math.max(targetTotal - fixedTotal, 0);
  const factor = variableTotal > 0 ? desiredVariable / variableTotal : 0;

  const scaled = variable.map((entry) => {
    const raw = entry.count * factor;
    const floored = Math.floor(raw);
    return {
      entry,
      count: Math.max(1, floored),
      frac: raw - floored,
    };
  });

  let currentTotal = fixedTotal + scaled.reduce((sum, entry) => sum + entry.count, 0);
  let diff = targetTotal - currentTotal;

  if (diff > 0) {
    const byFrac = [...scaled].sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < diff; i++) {
      const pick = byFrac[i % byFrac.length];
      pick.count += 1;
    }
  } else if (diff < 0) {
    const byFrac = [...scaled].sort((a, b) => a.frac - b.frac);
    let idx = 0;
    while (diff < 0 && idx < byFrac.length) {
      if (byFrac[idx].count > 1) {
        byFrac[idx].count -= 1;
        diff += 1;
      } else {
        idx += 1;
      }
    }
  }

  const scaledMap = new Map<string, number>();
  for (const entry of scaled) {
    scaledMap.set(entry.entry.letter, entry.count);
  }

  return BASE_DISTRIBUTION.map((entry) => ({
    ...entry,
    count: scaledMap.get(entry.letter) ?? entry.count,
  }));
}

function getDistribution(difficulty: Difficulty): DistributionEntry[] {
  if (difficulty === "hard") return BASE_DISTRIBUTION;
  return scaleDistribution(TARGET_TILE_COUNT[difficulty]);
}

// Very rough distribution for prototyping (replace later)
export function createTileBag(difficulty: Difficulty = "hard"): Tile[] {
  const distribution = getDistribution(difficulty);
  const bag: Tile[] = [];
  let id = 0;
  for (const entry of distribution) {
    for (let i = 0; i < entry.count; i++) {
      bag.push({
        id: `t${id++}`,
        letter: entry.letter,
        value: entry.value,
        isBlank: entry.isBlank,
      });
    }
  }
  return bag;
}
