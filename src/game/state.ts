import { RACK_SIZE } from "./constants";
import { generateModifiers, createEmptyBoard } from "./generator";
import { createTileBag } from "./constants";
import { Difficulty, GameState, Tile } from "./types";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

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

  const bag = shuffle(createTileBag());
  const playerDraw = draw(bag, RACK_SIZE);
  const balancedPlayer = rebalanceRack(playerDraw.take, playerDraw.rest);
  const aiDraw = draw(balancedPlayer.bag, RACK_SIZE);
  const balancedAi = rebalanceRack(aiDraw.take, aiDraw.rest);

  const tilesById: Record<string, Tile> = {};
  for (const t of bag) tilesById[t.id] = t;

  return {
    difficulty,
    board,
    bag: balancedAi.bag,
    rack: balancedPlayer.rack,
    aiRack: balancedAi.rack,
    tilesById,
    placedThisTurn: [],
    lastRevealAnim: 0,
    lastPlayedIds: [],
    scores: { player: 0, ai: 0 },
  };
}
