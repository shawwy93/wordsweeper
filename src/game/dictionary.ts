import rawWords from "../assets/wordlist.txt?raw";
import rawBlocked from "../assets/wordlist-blocked.txt?raw";

const COMMON_SINGLE = new Set(["A", "I"]);
const COMMON_TWO_LETTER = new Set([
  "AM", "AN", "AS", "AT", "BE", "BY", "DO", "GO", "HE", "HI", "IF", "IN", "IS", "IT",
  "ME", "MY", "NO", "OF", "OH", "OK", "ON", "OR", "OX", "SO", "TO", "UP", "US", "WE",
  "YA", "YE", "YO", "MA", "PA", "RE", "ID",
]);

const BLOCKED_WORDS = new Set(
  rawBlocked
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !w.startsWith("#"))
    .map((w) => w.toUpperCase())
    .filter((w) => /^[A-Z]+$/.test(w))
);

const WORDS = rawWords
  .split(/\r?\n/)
  .map((w) => w.trim().toUpperCase())
  .filter((w) => w.length > 0 && /^[A-Z]+$/.test(w))
  .filter((w) => (w.length > 1 || COMMON_SINGLE.has(w)))
  .filter((w) => (w.length !== 2 || COMMON_TWO_LETTER.has(w)))
  .filter((w) => !BLOCKED_WORDS.has(w));

export const DICTIONARY = new Set(WORDS);

export function isWord(word: string) {
  return DICTIONARY.has(word.toUpperCase());
}
