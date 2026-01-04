import { GameState } from "./types";
import { CENTER } from "./constants";
import { isWord } from "./dictionary";

export type WordPlay = {
  text: string;
  cells: Array<{ x: number; y: number; tileId: string }>;
};

export type ValidationResult =
  | { ok: true; words: WordPlay[] }
  | { ok: false; reason: string; words?: WordPlay[] };

export type ValidationOptions = {
  requireAllWords?: boolean;
};

function key(x: number, y: number) {
  return `${x},${y}`;
}

function tileIdAt(g: GameState, x: number, y: number) {
  return g.board[y]?.[x]?.tileId;
}

function letterAt(g: GameState, x: number, y: number) {
  const cell = g.board[y]?.[x];
  if (!cell) return "";
  if (cell.letterOverride) return cell.letterOverride;
  const id = cell.tileId;
  return id ? g.tilesById[id]?.letter ?? "" : "";
}

function buildLineWord(
  g: GameState,
  line: number,
  start: number,
  end: number,
  horizontal: boolean
) {
  const cells: WordPlay["cells"] = [];
  let text = "";
  for (let i = start; i <= end; i++) {
    const x = horizontal ? i : line;
    const y = horizontal ? line : i;
    const tileId = tileIdAt(g, x, y);
    if (!tileId) return null;
    cells.push({ x, y, tileId });
    text += letterAt(g, x, y);
  }
  return { text, cells };
}

function collectBoardWords(g: GameState) {
  const words: WordPlay[] = [];
  const size = g.board.length;
  const seen = new Set<string>();

  function addWord(word: WordPlay | null) {
    if (!word || word.text.length < 2) return;
    const wordKey = word.cells.map((c) => key(c.x, c.y)).join("|");
    if (seen.has(wordKey)) return;
    seen.add(wordKey);
    words.push(word);
  }

  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!tileIdAt(g, x, y)) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < size && tileIdAt(g, x, y)) x += 1;
      const end = x - 1;
      addWord(buildLineWord(g, y, start, end, true));
    }
  }

  for (let x = 0; x < size; x++) {
    let y = 0;
    while (y < size) {
      if (!tileIdAt(g, x, y)) {
        y += 1;
        continue;
      }
      const start = y;
      while (y < size && tileIdAt(g, x, y)) y += 1;
      const end = y - 1;
      addWord(buildLineWord(g, x, start, end, false));
    }
  }

  return words;
}

function buildCrossWord(g: GameState, x: number, y: number, horizontal: boolean) {
  let start = horizontal ? y : x;
  let end = horizontal ? y : x;
  const size = g.board.length;

  while (start > 0) {
    const nx = horizontal ? x : start - 1;
    const ny = horizontal ? start - 1 : y;
    if (!tileIdAt(g, nx, ny)) break;
    start -= 1;
  }

  while (end < size - 1) {
    const nx = horizontal ? x : end + 1;
    const ny = horizontal ? end + 1 : y;
    if (!tileIdAt(g, nx, ny)) break;
    end += 1;
  }

  const word = buildLineWord(g, horizontal ? x : y, start, end, !horizontal);
  if (!word || word.text.length <= 1) return null;
  return word;
}

export function validateMove(g: GameState, options?: ValidationOptions): ValidationResult {
  if (g.placedThisTurn.length === 0) {
    return { ok: false, reason: "Place at least one tile before submitting." };
  }

  const placedSet = new Set(g.placedThisTurn.map((p) => key(p.x, p.y)));
  const size = g.board.length;

  let hasExisting = false;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const id = tileIdAt(g, x, y);
      if (id && !placedSet.has(key(x, y))) {
        hasExisting = true;
        break;
      }
    }
    if (hasExisting) break;
  }

  if (!hasExisting) {
    if (!placedSet.has(key(CENTER.x, CENTER.y))) {
      return { ok: false, reason: "First move must cover the center start square." };
    }
  } else {
    let touches = false;
    for (const p of g.placedThisTurn) {
      const neighbors = [
        { x: p.x + 1, y: p.y },
        { x: p.x - 1, y: p.y },
        { x: p.x, y: p.y + 1 },
        { x: p.x, y: p.y - 1 },
      ];
      for (const n of neighbors) {
        const id = tileIdAt(g, n.x, n.y);
        if (id && !placedSet.has(key(n.x, n.y))) {
          touches = true;
          break;
        }
      }
      if (touches) break;
    }
    if (!touches) {
      return { ok: false, reason: "Move must connect to existing tiles." };
    }
  }

  const xs = new Set(g.placedThisTurn.map((p) => p.x));
  const ys = new Set(g.placedThisTurn.map((p) => p.y));
  if (xs.size > 1 && ys.size > 1) {
    return { ok: false, reason: "Tiles must be placed in a single straight line." };
  }

  const horizontal = ys.size === 1;
  const line = horizontal ? g.placedThisTurn[0].y : g.placedThisTurn[0].x;
  const coords = g.placedThisTurn.map((p) => (horizontal ? p.x : p.y));
  let start = Math.min(...coords);
  let end = Math.max(...coords);

  while (start > 0) {
    const x = horizontal ? start - 1 : line;
    const y = horizontal ? line : start - 1;
    if (!tileIdAt(g, x, y)) break;
    start -= 1;
  }

  while (end < size - 1) {
    const x = horizontal ? end + 1 : line;
    const y = horizontal ? line : end + 1;
    if (!tileIdAt(g, x, y)) break;
    end += 1;
  }

  const mainWord = buildLineWord(g, line, start, end, horizontal);
  if (!mainWord) {
    return { ok: false, reason: "Move contains a gap between tiles." };
  }

  const words: WordPlay[] = [];
  const wordKeys = new Set<string>();

  if (mainWord.text.length > 1) {
    words.push(mainWord);
    wordKeys.add(mainWord.cells.map((c) => key(c.x, c.y)).join("|"));
  }

  for (const p of g.placedThisTurn) {
    const cross = buildCrossWord(g, p.x, p.y, horizontal);
    if (!cross) continue;
    const crossKey = cross.cells.map((c) => key(c.x, c.y)).join("|");
    if (wordKeys.has(crossKey)) continue;
    wordKeys.add(crossKey);
    words.push(cross);
  }

  const hasWord = words.length > 0;
  if (!hasWord && mainWord.text.length === 1) {
    if (!isWord(mainWord.text)) {
      return { ok: false, reason: "Single-letter word is not valid.", words: [mainWord] };
    }
    words.push(mainWord);
  }

  for (const word of words) {
    if (!isWord(word.text)) {
      return { ok: false, reason: `Not in dictionary: ${word.text}`, words: [word] };
    }
  }

  if (options?.requireAllWords) {
    const allWords = collectBoardWords(g);
    for (const word of allWords) {
      if (!isWord(word.text)) {
        return { ok: false, reason: `Not in dictionary: ${word.text}`, words: [word] };
      }
    }
  }

  if (words.length === 0) {
    return { ok: false, reason: "Place tiles to form a valid word." };
  }

  return { ok: true, words };
}
