import { GameState } from "./types";
import { WordPlay } from "./validation";

function key(x: number, y: number) {
  return `${x},${y}`;
}

export function scoreTurn(g: GameState, words: WordPlay[]): number {
  if (words.length === 0) return 0;

  const placedSet = new Set(g.placedThisTurn.map((p) => key(p.x, p.y)));
  let total = 0;

  for (const word of words) {
    const wordText = word.text.toUpperCase();
    if (wordText === "BATMAN") {
      total += 100;
      continue;
    }
    let base = 0;
    let wordMult = 1;
    let evilWordCount = 0;

    for (const cell of word.cells) {
      const tile = g.tilesById[cell.tileId];
      if (!tile) continue;

      const isNew = placedSet.has(key(cell.x, cell.y));
      const boardCell = g.board[cell.y][cell.x];
      let letterScore = tile.value;
      let evilLetter = false;

      if (isNew && boardCell && boardCell.modifier && !boardCell.triggered) {
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
          case "EVIL_WORD":
            evilWordCount += 1;
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

/**
 * Reveals any hidden modifiers stepped on this turn.
 * Also marks those modifier squares as triggered (so in real scoring they will not apply again).
 */
export function applyRevealThisTurn(g: GameState): {
  nextBoard: GameState["board"];
  revealedNow: string[];
} {
  const nextBoard = g.board.map((row) => row.map((c) => ({ ...c })));
  const revealedNow: string[] = [];
  const now = Date.now();

  for (const p of g.placedThisTurn) {
    const cell = nextBoard[p.y][p.x];
    if (cell.modifier && !cell.revealed) {
      cell.revealed = true;
      cell.revealedAt = now;
      revealedNow.push(label(cell.modifier));
    }
    if (cell.modifier) cell.triggered = true;
  }

  return { nextBoard, revealedNow };
}

function label(m: GameState["board"][number][number]["modifier"]) {
  switch (m) {
    case "DL": return "DL";
    case "TL": return "TL";
    case "DW": return "DW";
    case "TW": return "TW";
    case "EVIL_LETTER": return "Evil Letter";
    case "EVIL_WORD": return "Evil Word";
    default: return "-";
  }
}
