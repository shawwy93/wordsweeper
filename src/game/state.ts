import { RACK_SIZE } from "./constants";
import { generateModifiers, createEmptyBoard } from "./generator";
import { createTileBag } from "./constants";
import { Difficulty, GameState, Tile } from "./types";
import { RACK_HELP_WORDS } from "./dictionary";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

const HARD_LETTERS = new Set(["J", "Q", "X", "Z"]);
const MEDIUM_LETTERS = new Set(["V", "K", "F", "W", "Y", "H"]);

const ASSIST_CONFIG: Record<Difficulty, { attempts: number; minLen: number; maxLen: number; acceptChance: number }> = {
  easy: { attempts: 10, minLen: 2, maxLen: 4, acceptChance: 0.85 },
  normal: { attempts: 6, minLen: 2, maxLen: 3, acceptChance: 0.6 },
  hard: { attempts: 3, minLen: 2, maxLen: 2, acceptChance: 0.35 },
};

function letterCounts(rack: Tile[]) {
  const counts = new Array(26).fill(0);
  let blanks = 0;
  for (const tile of rack) {
    if (tile.isBlank) {
      blanks += 1;
      continue;
    }
    const idx = tile.letter.charCodeAt(0) - 65;
    if (idx >= 0 && idx < 26) counts[idx] += 1;
  }
  return { counts, blanks };
}

function canMakeWord(counts: number[], blanks: number, wordCounts: number[]) {
  let needed = 0;
  for (let i = 0; i < 26; i++) {
    const diff = wordCounts[i] - counts[i];
    if (diff > 0) {
      needed += diff;
      if (needed > blanks) return false;
    }
  }
  return true;
}

function rackWordScore(rack: Tile[], minLen: number, maxLen: number) {
  const { counts, blanks } = letterCounts(rack);
  let score = 0;
  let matches = 0;
  for (const word of RACK_HELP_WORDS) {
    if (word.length < minLen || word.length > maxLen) continue;
    if (!canMakeWord(counts, blanks, word.counts)) continue;
    score += word.length;
    matches += 1;
    if (matches >= 12) break;
  }
  return score;
}

function rackHasMix(rack: Tile[]) {
  const hasBlank = rack.some((t) => t.isBlank);
  if (hasBlank) return true;
  const hasVowel = rack.some((t) => !t.isBlank && isVowel(t.letter));
  const hasConsonant = rack.some((t) => !t.isBlank && !isVowel(t.letter));
  return hasVowel && hasConsonant;
}

function pickWeightedIndex(weights: number[]) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

function rackTileWeight(tile: Tile) {
  if (tile.isBlank) return 0.4;
  if (HARD_LETTERS.has(tile.letter)) return 2.6;
  if (MEDIUM_LETTERS.has(tile.letter)) return 1.6;
  return 1;
}

function bagTileWeight(tile: Tile) {
  if (tile.isBlank) return 2.4;
  if (isVowel(tile.letter)) return 2.1;
  if ("ETAOINRSTL".includes(tile.letter)) return 1.6;
  if (HARD_LETTERS.has(tile.letter)) return 0.7;
  return 1;
}

function pickBagIndex(bag: Tile[]) {
  let bestIndex = Math.floor(Math.random() * bag.length);
  let bestScore = bagTileWeight(bag[bestIndex]);
  const samples = Math.min(3, bag.length);
  for (let i = 0; i < samples; i++) {
    const idx = Math.floor(Math.random() * bag.length);
    const score = bagTileWeight(bag[idx]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  }
  return bestIndex;
}

export function assistPlayerRack(rack: Tile[], bag: Tile[], difficulty: Difficulty) {
  const config = ASSIST_CONFIG[difficulty];
  if (!config || config.attempts <= 0 || bag.length === 0) return { rack, bag };

  const baseAny = rackWordScore(rack, 2, 4);
  if (baseAny > 0) return { rack, bag };

  const baseScore = rackWordScore(rack, config.minLen, config.maxLen);

  const rackWeights = rack.map((tile) => rackTileWeight(tile));
  let bestRack = rack;
  let bestBag = bag;
  let bestScore = baseScore;

  for (let attempt = 0; attempt < config.attempts; attempt++) {
    const rackIndex = pickWeightedIndex(rackWeights);
    if (rack[rackIndex]?.isBlank) continue;
    const bagIndex = pickBagIndex(bag);
    const nextRack = [...rack];
    const nextBag = [...bag];
    const outgoing = nextRack[rackIndex];
    nextRack[rackIndex] = nextBag[bagIndex];
    nextBag[bagIndex] = outgoing;

    if (!rackHasMix(nextRack)) continue;

    const score = rackWordScore(nextRack, config.minLen, config.maxLen);
    if (score > bestScore) {
      bestScore = score;
      bestRack = nextRack;
      bestBag = nextBag;
    }
    if (score > 0 && Math.random() < config.acceptChance) {
      return { rack: nextRack, bag: nextBag };
    }
  }

  if (bestScore > baseScore) {
    return { rack: bestRack, bag: bestBag };
  }

  return { rack, bag };
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function draw(bag: Tile[], n: number) {
  const take = bag.slice(0, n);
  const rest = bag.slice(n);
  return { take, rest };
}

function isVowel(letter: string) {
  return VOWELS.has(letter);
}

export function rebalanceRack(rack: Tile[], bag: Tile[]) {
  const hasBlank = rack.some((t) => t.isBlank);
  const hasVowel = rack.some((t) => !t.isBlank && isVowel(t.letter));
  const hasConsonant = rack.some((t) => !t.isBlank && !isVowel(t.letter));
  if (hasBlank || (hasVowel && hasConsonant) || bag.length === 0) {
    return { rack, bag };
  }

  const needVowel = !hasVowel;
  const bagIndex = bag.findIndex((t) => !t.isBlank && isVowel(t.letter) === needVowel);
  const rackIndex = rack.findIndex((t) => !t.isBlank && isVowel(t.letter) !== needVowel);
  if (bagIndex === -1 || rackIndex === -1) {
    return { rack, bag };
  }

  const newRack = [...rack];
  const newBag = [...bag];
  const swap = newRack[rackIndex];
  newRack[rackIndex] = newBag[bagIndex];
  newBag[bagIndex] = swap;

  return { rack: newRack, bag: newBag };
}

export function createNewGame(difficulty: Difficulty): GameState {
  const baseBoard = createEmptyBoard();
  const board = generateModifiers(baseBoard);

  const bag = shuffle(createTileBag(difficulty));
  const playerDraw = draw(bag, RACK_SIZE);
  const balancedPlayer = rebalanceRack(playerDraw.take, playerDraw.rest);
  const assistedPlayer = assistPlayerRack(balancedPlayer.rack, balancedPlayer.bag, difficulty);
  const aiDraw = draw(assistedPlayer.bag, RACK_SIZE);
  const balancedAi = rebalanceRack(aiDraw.take, assistedPlayer.bag);

  const tilesById: Record<string, Tile> = {};
  for (const t of bag) tilesById[t.id] = t;

  return {
    difficulty,
    board,
    bag: balancedAi.bag,
    rack: assistedPlayer.rack,
    aiRack: balancedAi.rack,
    tilesById,
    placedThisTurn: [],
    lastRevealAnim: 0,
    lastPlayedIds: [],
    scores: { player: 0, ai: 0 },
  };
}
