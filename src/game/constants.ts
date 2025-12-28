import { ModifierType, Tile } from "./types";

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

// Very rough distribution for prototyping (replace later)
export function createTileBag(): Tile[] {
  const distribution: Array<{ letter: string; count: number; value: number; isBlank?: boolean }> = [
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
