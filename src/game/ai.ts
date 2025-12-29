import { BOARD_SIZE, CENTER } from "./constants";
import { DICTIONARY, isWord } from "./dictionary";
import { GameState, PlacedTile } from "./types";
import { validateMove, WordPlay } from "./validation";

type TrieNode = {
  children: Record<string, TrieNode>;
  isWord: boolean;
};

export type AiMove = {
  placements: PlacedTile[];
  words: WordPlay[];
  score: number;
  maxWordLength: number;
  tileCount: number;
  evilHits: number;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const TRIE_ROOT: TrieNode = { children: {}, isWord: false };

function addWord(word: string) {
  let node = TRIE_ROOT;
  for (const ch of word) {
    if (!node.children[ch]) node.children[ch] = { children: {}, isWord: false };
    node = node.children[ch];
  }
  node.isWord = true;
}

for (const word of DICTIONARY) {
  if (word.length <= BOARD_SIZE && /^[A-Z]+$/.test(word)) {
    addWord(word);
  }
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

function hasAnyTile(g: GameState) {
  for (const row of g.board) {
    for (const cell of row) {
      if (cell.tileId) return true;
    }
  }
  return false;
}

function isAdjacentToTile(g: GameState, x: number, y: number) {
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (!g.board[ny]?.[nx]) continue;
    if (g.board[ny][nx].tileId) return true;
  }
  return false;
}

function getAnchors(g: GameState) {
  if (!hasAnyTile(g)) return [CENTER];
  const anchors: Array<{ x: number; y: number }> = [];
  const size = g.board.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (tileIdAt(g, x, y)) continue;
      if (isAdjacentToTile(g, x, y)) anchors.push({ x, y });
    }
  }
  return anchors;
}

function crossCheckLetters(
  g: GameState,
  x: number,
  y: number,
  horizontal: boolean,
  cache: Map<string, Set<string> | null>
) {
  const key = `${x},${y},${horizontal ? "H" : "V"}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let prefix = "";
  let suffix = "";

  if (horizontal) {
    let cy = y - 1;
    while (cy >= 0 && tileIdAt(g, x, cy)) {
      prefix = letterAt(g, x, cy) + prefix;
      cy -= 1;
    }
    cy = y + 1;
    while (cy < g.board.length && tileIdAt(g, x, cy)) {
      suffix += letterAt(g, x, cy);
      cy += 1;
    }
  } else {
    let cx = x - 1;
    while (cx >= 0 && tileIdAt(g, cx, y)) {
      prefix = letterAt(g, cx, y) + prefix;
      cx -= 1;
    }
    cx = x + 1;
    while (cx < g.board.length && tileIdAt(g, cx, y)) {
      suffix += letterAt(g, cx, y);
      cx += 1;
    }
  }

  if (!prefix && !suffix) {
    cache.set(key, null);
    return null;
  }

  const allowed = new Set<string>();
  for (const letter of ALPHABET) {
    if (isWord(`${prefix}${letter}${suffix}`)) {
      allowed.add(letter);
    }
  }
  cache.set(key, allowed);
  return allowed;
}

function scoreWithRevealed(g: GameState, words: WordPlay[]) {
  const placedSet = new Set(g.placedThisTurn.map((p) => `${p.x},${p.y}`));
  let total = 0;

  for (const word of words) {
    let base = 0;
    let wordMult = 1;
    let evilWordCount = 0;

    for (const cell of word.cells) {
      const tile = g.tilesById[cell.tileId];
      if (!tile) continue;

      const isNew = placedSet.has(`${cell.x},${cell.y}`);
      const boardCell = g.board[cell.y][cell.x];
      let letterScore = tile.value;
      let evilLetter = false;

      if (boardCell?.modifier === "EVIL_WORD" && boardCell.revealed) {
        evilWordCount += 1;
      }

      if (isNew && boardCell.modifier && boardCell.revealed && !boardCell.triggered && boardCell.modifier !== "EVIL_WORD") {
        switch (boardCell.modifier) {
          case "DL":
            letterScore *= 2;
            break;
          case "TL":
            letterScore *= 3;
            break;
          case "DW":
            wordMult *= 2;
            break;
          case "TW":
            wordMult *= 3;
            break;
          case "EVIL_LETTER":
            evilLetter = true;
            break;
          default:
            break;
        }
      }

      base += evilLetter ? -letterScore : letterScore;
    }

    total += base * wordMult - base * evilWordCount;
  }

  return total;
}

function simulatePlacement(g: GameState, placements: PlacedTile[]) {
  const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
  for (const p of placements) {
    const cell = newBoard[p.y]?.[p.x];
    if (!cell || cell.tileId) return null;
    cell.tileId = p.tileId;
    cell.letterOverride = p.letterOverride;
  }
  return {
    ...g,
    board: newBoard,
    placedThisTurn: placements,
  };
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function maxWordLength(words: WordPlay[]) {
  let max = 0;
  for (const word of words) {
    if (word.text.length > max) max = word.text.length;
  }
  return max;
}

function isBetterHard(candidate: AiMove, current: AiMove | null) {
  if (!current) return true;
  if (candidate.score !== current.score) return candidate.score > current.score;
  return candidate.maxWordLength > current.maxWordLength;
}

function chooseNormal(moves: AiMove[]) {
  const sorted = [...moves].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, Math.min(sorted.length, 8));
  const medium = top.filter((move) => move.maxWordLength >= 4 && move.maxWordLength <= 6);
  let pickFrom = medium.length > 0 ? medium : top;
  if (pickFrom.length > 1 && Math.random() < 0.35) {
    pickFrom = pickFrom.slice(1);
  }
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

function chooseEasy(moves: AiMove[]) {
  const withEvil = moves.filter((move) => move.evilHits > 0);
  const pool = withEvil.length > 0 ? withEvil : moves;
  const sorted = [...pool].sort((a, b) => {
    if (b.evilHits != a.evilHits) return b.evilHits - a.evilHits;
    if (a.maxWordLength != b.maxWordLength) return a.maxWordLength - b.maxWordLength;
    return a.score - b.score;
  });
  const short = sorted.filter((move) => move.maxWordLength <= 4);
  const base = short.length > 0 ? short : sorted;
  const cap = Math.min(base.length, 12);
  let pickFrom = base.slice(0, cap);
  if (pickFrom.length > 3) {
    const start = Math.floor(pickFrom.length * 0.4);
    pickFrom = pickFrom.slice(start);
  }
  if (Math.random() < 0.2) {
    pickFrom = base;
  }
  return pickFrom[Math.floor(Math.random() * pickFrom.length)];
}

export function chooseAiMove(g: GameState): AiMove | null {
  if (g.aiRack.length === 0) return null;

  let anchors = getAnchors(g);
  if (g.difficulty !== "hard") {
    anchors = shuffleInPlace(anchors);
  }
  const anchorLimit =
    g.difficulty === "hard" ? anchors.length : g.difficulty === "normal" ? 24 : 14;
  anchors = anchors.slice(0, Math.min(anchorLimit, anchors.length));

  const rackCounts: Record<string, number> = {};
  const rackIds: Record<string, string[]> = {};
  const blankIds: string[] = [];
  for (const tile of g.aiRack) {
    if (tile.isBlank) {
      blankIds.push(tile.id);
      continue;
    }
    rackCounts[tile.letter] = (rackCounts[tile.letter] ?? 0) + 1;
    if (!rackIds[tile.letter]) rackIds[tile.letter] = [];
    rackIds[tile.letter].push(tile.id);
  }
  const rackLetters = Object.keys(rackCounts);
  const crossCache = new Map<string, Set<string> | null>();

  let best: AiMove | null = null;
  const candidates: AiMove[] = [];
  const keepCandidates = g.difficulty !== "hard";
  const size = g.board.length;
  const maxEvaluations =
    g.difficulty === "hard" ? Number.POSITIVE_INFINITY : g.difficulty === "normal" ? 700 : 250;
  let evalCount = 0;
  let reachedLimit = false;

  function evaluatePlacements(placements: PlacedTile[]) {
    if (placements.length === 0 || reachedLimit) return;
    evalCount += 1;
    if (evalCount > maxEvaluations) {
      reachedLimit = true;
      return;
    }
    const sim = simulatePlacement(g, placements);
    if (!sim) return;
    const result = validateMove(sim);
    if (!result.ok) return;
    const score = scoreWithRevealed(sim, result.words);
    let evilHits = 0;
    for (const p of placements) {
      const cell = g.board[p.y]?.[p.x];
      if (!cell || cell.triggered) continue;
      if (cell.modifier === "EVIL_LETTER" || cell.modifier === "EVIL_WORD") {
        evilHits += 1;
      }
    }
    const move = {
      placements: placements.map((p) => ({ ...p })),
      words: result.words,
      score,
      maxWordLength: maxWordLength(result.words),
      tileCount: placements.length,
      evilHits,
    };
    if (isBetterHard(move, best)) best = move;
    if (keepCandidates) candidates.push(move);
  }

  function searchLine(anchor: { x: number; y: number }, horizontal: boolean) {
    const line = horizontal ? anchor.y : anchor.x;
    const anchorPos = horizontal ? anchor.x : anchor.y;

    function coordAt(pos: number) {
      return horizontal ? { x: pos, y: line } : { x: line, y: pos };
    }

    function dfs(
      pos: number,
      node: TrieNode,
      placements: PlacedTile[],
      anchorIncluded: boolean,
      placedCount: number
    ) {
      if (reachedLimit || pos >= size) return;

      const { x, y } = coordAt(pos);
      const cell = g.board[y][x];

      if (cell.tileId) {
        const letter = g.tilesById[cell.tileId]?.letter ?? "";
        const nextNode = node.children[letter];
        if (!nextNode) return;
        const nextAnchor = anchorIncluded || pos === anchorPos;

        const nextPos = pos + 1;
        const nextCoord = coordAt(nextPos);
        const nextHasTile = nextPos < size && tileIdAt(g, nextCoord.x, nextCoord.y);
        if (nextNode.isWord && nextAnchor && placedCount > 0 && !nextHasTile) {
          evaluatePlacements(placements);
        }

        dfs(nextPos, nextNode, placements, nextAnchor, placedCount);
        return;
      }

      const allowed = crossCheckLetters(g, x, y, horizontal, crossCache);

      for (const letter of rackLetters) {
        if (reachedLimit) return;
        if (rackCounts[letter] <= 0) continue;
        if (allowed && !allowed.has(letter)) continue;
        const nextNode = node.children[letter];
        if (!nextNode) continue;

        const tileId = rackIds[letter].pop();
        if (!tileId) continue;
        rackCounts[letter] -= 1;
        placements.push({ tileId, x, y });

        const nextAnchor = anchorIncluded || pos === anchorPos;
        const nextPlaced = placedCount + 1;
        const nextPos = pos + 1;
        const nextCoord = coordAt(nextPos);
        const nextHasTile = nextPos < size && tileIdAt(g, nextCoord.x, nextCoord.y);
        if (nextNode.isWord && nextAnchor && nextPlaced > 0 && !nextHasTile) {
          evaluatePlacements(placements);
        }

        if (nextPos < size) {
          dfs(nextPos, nextNode, placements, nextAnchor, nextPlaced);
        }

        placements.pop();
        rackCounts[letter] += 1;
        rackIds[letter].push(tileId);
      }

      if (blankIds.length > 0) {
        for (const letter of ALPHABET) {
          if (reachedLimit) return;
          if (allowed && !allowed.has(letter)) continue;
          const nextNode = node.children[letter];
          if (!nextNode) continue;

          const tileId = blankIds.pop();
          if (!tileId) continue;
          placements.push({ tileId, x, y, letterOverride: letter });

          const nextAnchor = anchorIncluded || pos === anchorPos;
          const nextPlaced = placedCount + 1;
          const nextPos = pos + 1;
          const nextCoord = coordAt(nextPos);
          const nextHasTile = nextPos < size && tileIdAt(g, nextCoord.x, nextCoord.y);
          if (nextNode.isWord && nextAnchor && nextPlaced > 0 && !nextHasTile) {
            evaluatePlacements(placements);
          }

          if (nextPos < size) {
            dfs(nextPos, nextNode, placements, nextAnchor, nextPlaced);
          }

          placements.pop();
          blankIds.push(tileId);
        }
      }
    }

    for (let start = 0; start <= anchorPos; start++) {
      if (reachedLimit) break;
      if (start > 0) {
        const prev = coordAt(start - 1);
        if (tileIdAt(g, prev.x, prev.y)) continue;
      }
      dfs(start, TRIE_ROOT, [], false, 0);
    }
  }

  for (const anchor of anchors) {
    if (reachedLimit) break;
    searchLine(anchor, true);
    searchLine(anchor, false);
  }

  if (!best) return null;
  if (g.difficulty === "hard") return best;
  const pool = candidates.length > 0 ? candidates : [best];
  return g.difficulty === "easy" ? chooseEasy(pool) : chooseNormal(pool);
}


export function findHintMove(g: GameState): AiMove | null {
  const base: GameState = {
    ...g,
    aiRack: g.rack,
    placedThisTurn: [],
  };
  const easy = chooseAiMove({ ...base, difficulty: "easy" });
  if (easy) return easy;
  const normal = chooseAiMove({ ...base, difficulty: "normal" });
  if (normal) return normal;
  return chooseAiMove({ ...base, difficulty: "hard" });
}
