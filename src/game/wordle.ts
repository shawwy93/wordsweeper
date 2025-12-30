import { DICTIONARY, isWord } from "./dictionary";

export const WORDLE_LENGTH = 5;
export const WORDLE_ATTEMPTS = 6;

export type LetterState = "correct" | "present" | "absent";

const WORDLE_WORDS = Array.from(DICTIONARY).filter(
  (word) => word.length === WORDLE_LENGTH && /^[A-Z]+$/.test(word)
);

export function pickWordleTarget() {
  if (WORDLE_WORDS.length === 0) return "";
  const idx = Math.floor(Math.random() * WORDLE_WORDS.length);
  return WORDLE_WORDS[idx];
}

export function pickEvilPositions(length: number = WORDLE_LENGTH) {
  const count = Math.random() < 0.35 ? 2 : 1;
  const positions = new Set<number>();
  while (positions.size < count) {
    positions.add(Math.floor(Math.random() * length));
  }
  return Array.from(positions.values()).sort((a, b) => a - b);
}

export function isValidWordleGuess(word: string) {
  if (word.length !== WORDLE_LENGTH) return false;
  return isWord(word);
}

export function evaluateGuess(guess: string, target: string): LetterState[] {
  const upperGuess = guess.toUpperCase();
  const upperTarget = target.toUpperCase();
  const states: LetterState[] = new Array(upperGuess.length).fill("absent");
  const counts: Record<string, number> = {};

  for (let i = 0; i < upperTarget.length; i++) {
    const letter = upperTarget[i];
    counts[letter] = (counts[letter] ?? 0) + 1;
  }

  for (let i = 0; i < upperGuess.length; i++) {
    if (upperGuess[i] === upperTarget[i]) {
      states[i] = "correct";
      counts[upperGuess[i]] -= 1;
    }
  }

  for (let i = 0; i < upperGuess.length; i++) {
    if (states[i] === "correct") continue;
    const letter = upperGuess[i];
    if ((counts[letter] ?? 0) > 0) {
      states[i] = "present";
      counts[letter] -= 1;
    }
  }

  return states;
}
