import { BOARD_SIZE, CENTER, MODIFIER_COUNTS } from "./constants";
import { BoardCell, ModifierType } from "./types";

// Simple RNG (seedable later if you want)
function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function key(x: number, y: number) {
  return `${x},${y}`;
}

const STRONG: ModifierType[] = ["TW", "EVIL_WORD"];
const MID: ModifierType[] = ["DW", "TL", "EVIL_LETTER"];
const LIGHT: ModifierType[] = ["DL"];

function minDistanceOk(
  positions: Array<{ x: number; y: number; type: ModifierType }>,
  x: number,
  y: number,
  type: ModifierType
) {
  const dist = (a: number, b: number, c: number, d: number) =>
    Math.abs(a - c) + Math.abs(b - d);

  const wanted =
    STRONG.includes(type) ? 5 : MID.includes(type) ? 3 : LIGHT.includes(type) ? 2 : 0;

  if (wanted === 0) return true;

  for (const p of positions) {
    const w =
      STRONG.includes(p.type) ? 5 : MID.includes(p.type) ? 3 : LIGHT.includes(p.type) ? 2 : 0;
    const threshold = Math.min(wanted, w);
    if (dist(p.x, p.y, x, y) < threshold) return false;
  }
  return true;
}

export function createEmptyBoard(): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: BoardCell[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push({
        x,
        y,
        isCenter: x === CENTER.x && y === CENTER.y,
        modifier: null,
        revealed: false,
        triggered: false,
      });
    }
    board.push(row);
  }
  return board;
}

/**
 * Generates a randomized hidden modifier layout with basic anti-clustering.
 * Also tries to keep top/bottom expected value roughly balanced.
 */
export function generateModifiers(board: BoardCell[][]) {
  const occupied = new Set<string>([key(CENTER.x, CENTER.y)]);
  const placed: Array<{ x: number; y: number; type: ModifierType }> = [];

  const pool: ModifierType[] = [];
  (Object.keys(MODIFIER_COUNTS) as Array<Exclude<ModifierType, null>>).forEach((t) => {
    for (let i = 0; i < MODIFIER_COUNTS[t]; i++) pool.push(t);
  });

  // Place strong first, then mid, then light
  const priority = (t: ModifierType) =>
    STRONG.includes(t) ? 0 : MID.includes(t) ? 1 : LIGHT.includes(t) ? 2 : 3;

  pool.sort((a, b) => priority(a) - priority(b));

  for (const type of pool) {
    let placedOne = false;
    for (let tries = 0; tries < 500 && !placedOne; tries++) {
      const x = randInt(BOARD_SIZE);
      const y = randInt(BOARD_SIZE);
      if (occupied.has(key(x, y))) continue;
      if (!minDistanceOk(placed, x, y, type)) continue;

      occupied.add(key(x, y));
      placed.push({ x, y, type });
      board[y][x].modifier = type;
      placedOne = true;
    }
    // If placement fails, we skip (rare). You can log or relax constraints.
  }

  // Balance pass: adjust total EV between top and bottom halves
  balanceTopBottom(board);
  addVisibleGoodNearEvil(board);

  return board;
}


function isEvil(mod: ModifierType) {
  return mod === "EVIL_LETTER" || mod === "EVIL_WORD";
}


function addVisibleGoodNearEvil(board: BoardCell[][]) {
  const size = board.length;
  const occupied = new Set<string>();
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const goodPool: ModifierType[] = ["DL", "DW", "TL"];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      if (!cell.modifier || !isEvil(cell.modifier)) continue;
      const options = dirs
        .map((d) => ({ x: x + d.x, y: y + d.y }))
        .filter((pos) => pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size)
        .filter((pos) => {
          const target = board[pos.y][pos.x];
          if (!target) return false;
          if (target.isCenter) return false;
          if (target.modifier) return false;
          if (occupied.has(key(pos.x, pos.y))) return false;
          return true;
        });
      if (options.length === 0) continue;
      const choice = options[randInt(options.length)];
      const target = board[choice.y][choice.x];
      target.modifier = goodPool[randInt(goodPool.length)];
      target.revealed = true;
      target.triggered = false;
      occupied.add(key(choice.x, choice.y));
    }
  }
}

function ev(mod: ModifierType) {
  switch (mod) {
    case "DL": return 1;
    case "TL": return 2;
    case "DW": return 2;
    case "TW": return 4;
    case "EVIL_LETTER": return -1.5;
    case "EVIL_WORD": return -3;
    default: return 0;
  }
}

function balanceTopBottom(board: BoardCell[][]) {
  const top: Array<{ x: number; y: number }> = [];
  const bot: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const c = board[y][x];
      if (!c.modifier) continue;
      if (c.isCenter) continue;
      if (y < BOARD_SIZE / 2) top.push({ x, y });
      else bot.push({ x, y });
    }
  }

  const sum = (arr: Array<{ x: number; y: number }>) =>
    arr.reduce((acc, p) => acc + ev(board[p.y][p.x].modifier), 0);

  let topEv = sum(top);
  let botEv = sum(bot);

  const targetDiff = 4; // tweak threshold
  let guard = 0;

  while (Math.abs(topEv - botEv) > targetDiff && guard++ < 200) {
    const heavy = topEv > botEv ? top : bot;
    const light = topEv > botEv ? bot : top;

    if (heavy.length === 0 || light.length === 0) break;

    const a = heavy[randInt(heavy.length)];
    const b = light[randInt(light.length)];

    const am = board[a.y][a.x].modifier;
    const bm = board[b.y][b.x].modifier;

    board[a.y][a.x].modifier = bm;
    board[b.y][b.x].modifier = am;

    topEv = sum(top);
    botEv = sum(bot);
  }
}
