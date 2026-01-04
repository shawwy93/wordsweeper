import { DICTIONARY, isWord } from "./dictionary";
import { BOARD_SIZE, LETTER_VALUES } from "./constants";
import { BoardCell, Tile } from "./types";

const CROSS_POOL_SIZE = 100;
const CROSS_WORD_COUNT = 8;
const MIN_LEN = 3;
const MAX_LEN = 7;

const LENGTH_WEIGHTS: Record<number, number> = {
  3: 0.9,
  4: 1.6,
  5: 1.1,
  6: 0.6,
  7: 0.25,
};

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightForLength(length: number) {
  return LENGTH_WEIGHTS[length] ?? 1;
}

const RAW_POOL = Array.from(DICTIONARY).filter(
  (word) => word.length >= MIN_LEN && word.length <= MAX_LEN && /^[A-Z]+$/.test(word)
);

function buildCrossBag() {
  const pool = shuffle([...RAW_POOL]);
  if (pool.length <= CROSS_POOL_SIZE) return pool;
  return pool.slice(0, CROSS_POOL_SIZE);
}

function pickWeightedWord(poolByLength: Map<number, string[]>) {
  const lengths = Array.from(poolByLength.entries())
    .filter(([, words]) => words.length > 0)
    .map(([length]) => length);
  if (lengths.length === 0) return null;

  const weights = lengths.map((length) => weightForLength(length));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  let chosenLength = lengths[lengths.length - 1];
  for (let i = 0; i < lengths.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      chosenLength = lengths[i];
      break;
    }
  }

  const list = poolByLength.get(chosenLength);
  if (!list || list.length === 0) return null;
  const idx = Math.floor(Math.random() * list.length);
  const word = list[idx];
  list.splice(idx, 1);
  if (list.length === 0) {
    poolByLength.delete(chosenLength);
  }
  return word;
}

function canPlaceWord(
  board: BoardCell[][],
  tilesById: Record<string, Tile>,
  word: string,
  x: number,
  y: number,
  horizontal: boolean
) {

  const size = board.length;
  if (horizontal) {
    if (x + word.length > size) return false;
  } else {
    if (y + word.length > size) return false;
  }

  for (let i = 0; i < word.length; i++) {
    const cx = horizontal ? x + i : x;
    const cy = horizontal ? y : y + i;
    const cell = board[cy]?.[cx];
    if (!cell) return false;
    if (cell.tileId) {
      const existing = tilesById[cell.tileId];
      if (!existing || existing.letter !== word[i]) return false;
    }
  }

  return true;
}

function letterAt(board: BoardCell[][], tilesById: Record<string, Tile>, x: number, y: number) {
  const id = board[y]?.[x]?.tileId;
  if (!id) return "";
  return tilesById[id]?.letter ?? "";
}

function areBoardWordsValid(board: BoardCell[][], tilesById: Record<string, Tile>) {
  const size = board.length;

  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!board[y]?.[x]?.tileId) {
        x += 1;
        continue;
      }
      let word = "";
      let length = 0;
      while (x < size && board[y]?.[x]?.tileId) {
        word += letterAt(board, tilesById, x, y);
        length += 1;
        x += 1;
      }
      if (length >= 2 && !isWord(word)) return false;
    }
  }

  for (let x = 0; x < size; x++) {
    let y = 0;
    while (y < size) {
      if (!board[y]?.[x]?.tileId) {
        y += 1;
        continue;
      }
      let word = "";
      let length = 0;
      while (y < size && board[y]?.[x]?.tileId) {
        word += letterAt(board, tilesById, x, y);
        length += 1;
        y += 1;
      }
      if (length >= 2 && !isWord(word)) return false;
    }
  }

  return true;
}

function placeWord(
  board: BoardCell[][],
  tilesById: Record<string, Tile>,
  word: string,
  x: number,
  y: number,
  horizontal: boolean,
  nextId: number
) {
  for (let i = 0; i < word.length; i++) {
    const cx = horizontal ? x + i : x;
    const cy = horizontal ? y : y + i;
    const cell = board[cy][cx];
    if (cell.tileId) continue;
    const letter = word[i];
    const id = `c${nextId++}`;
    tilesById[id] = {
      id,
      letter,
      value: LETTER_VALUES[letter] ?? 1,
    };
    cell.tileId = id;
  }
  return nextId;
}

export function seedCrossWords(board: BoardCell[][], tilesById: Record<string, Tile>) {
  const pool = shuffle(buildCrossBag());
  const poolByLength = new Map<number, string[]>();
  for (const word of pool) {
    const list = poolByLength.get(word.length) ?? [];
    list.push(word);
    poolByLength.set(word.length, list);
  }

  const placed: string[] = [];
  let nextId = 0;
  let remaining = pool.length;

  while (placed.length < CROSS_WORD_COUNT && remaining > 0) {
    const word = pickWeightedWord(poolByLength);
    if (!word) break;
    remaining -= 1;

    let placedWord = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      const horizontal = Math.random() < 0.5;
      const maxX = horizontal ? BOARD_SIZE - word.length : BOARD_SIZE - 1;
      const maxY = horizontal ? BOARD_SIZE - 1 : BOARD_SIZE - word.length;
      const x = Math.floor(Math.random() * (maxX + 1));
      const y = Math.floor(Math.random() * (maxY + 1));

      if (!canPlaceWord(board, tilesById, word, x, y, horizontal)) continue;

      const boardCopy = board.map((row) => row.map((cell) => ({ ...cell })));
      const tilesCopy = { ...tilesById };
      const nextIdPreview = placeWord(boardCopy, tilesCopy, word, x, y, horizontal, nextId);
      if (!areBoardWordsValid(boardCopy, tilesCopy)) continue;

      nextId = placeWord(board, tilesById, word, x, y, horizontal, nextId);
      if (nextId !== nextIdPreview) {
        nextId = nextIdPreview;
      }
      placed.push(word);
      placedWord = true;
      break;
    }

    if (!placedWord) {
      continue;
    }
  }

  return { board, tilesById, words: placed };
}
