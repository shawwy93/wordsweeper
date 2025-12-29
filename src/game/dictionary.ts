import rawWords from "../assets/wordlist.txt?raw";
import rawBlocked from "../assets/wordlist-blocked.txt?raw";

const COMMON_SINGLE = new Set(["A", "I"]);
const COMMON_TWO_LETTER = new Set([
  "AM", "AN", "AS", "AT", "BE", "BY", "DO", "GO", "HE", "HI", "IF", "IN", "IS", "IT",
  "ME", "MY", "NO", "OF", "OH", "OK", "ON", "OR", "OX", "SO", "TO", "UP", "US", "WE",
  "YA", "YE", "YO", "MA", "PA", "RE", "ID",
]);


type RackWord = {
  text: string;
  counts: number[];
  length: number;
};

function buildCounts(word: string) {
  const counts = new Array(26).fill(0);
  for (const ch of word) {
    const idx = ch.charCodeAt(0) - 65;
    if (idx >= 0 && idx < 26) counts[idx] += 1;
  }
  return counts;
}

const BLOCKED_WORDS = new Set(
  rawBlocked
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !w.startsWith("#"))
    .map((w) => w.toUpperCase())
    .filter((w) => /^[A-Z]+$/.test(w))
);

const SPECIAL_WORDS = new Set(["BATMAN"]);

const WORDS = rawWords
  .split(/\r?\n/)
  .map((w) => w.trim().toUpperCase())
  .filter((w) => w.length > 0 && /^[A-Z]+$/.test(w))
  .filter((w) => (w.length > 1 || COMMON_SINGLE.has(w)))
  .filter((w) => (w.length !== 2 || COMMON_TWO_LETTER.has(w)))
  .filter((w) => !BLOCKED_WORDS.has(w));


export const RACK_HELP_WORDS: RackWord[] = WORDS
  .filter((w) => w.length >= 2 && w.length <= 4)
  .map((w) => ({ text: w, counts: buildCounts(w), length: w.length }));

export const DICTIONARY = new Set(WORDS);
SPECIAL_WORDS.forEach((w) => DICTIONARY.add(w));

export function isWord(word: string) {
  const upper = word.toUpperCase();
  if (SPECIAL_WORDS.has(upper)) return true;
  return DICTIONARY.has(upper);
}
