import { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import Button from "../components/Button";
import {
  WORDLE_ATTEMPTS,
  WORDLE_LENGTH,
  evaluateGuess,
  isValidWordleGuess,
  pickEvilPositions,
  pickWordleTarget,
  type LetterState,
} from "../game/wordle";
import { computeLevelProgress, computeXpGain } from "../progression/leveling";
import { loadProgression, saveProgression } from "../progression/storage";
import tileBase from "../assets/tile-base.png";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type GuessResult = {
  word: string;
  states: LetterState[];
  evilHits: number[];
};

type Toast = { text: string; tone: "danger" | "info" };

type XpSummary = {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  totalXP: number;
};

type Props = {
  onExit: () => void;
};

function buildLetterStates(results: GuessResult[]) {
  const state: Record<string, LetterState> = {};
  for (const result of results) {
    result.word.split("").forEach((letter, idx) => {
      const next = result.states[idx];
      const prev = state[letter];
      if (!prev || prev === "absent" || (prev === "present" && next === "correct")) {
        state[letter] = next;
      }
    });
  }
  return state;
}

export default function WordleScreen(props: Props) {
  const [targetWord, setTargetWord] = useState(() => pickWordleTarget());
  const [evilPositions, setEvilPositions] = useState<number[]>(() => pickEvilPositions());
  const [evilRevealed, setEvilRevealed] = useState<Set<number>>(() => new Set());
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(WORDLE_ATTEMPTS);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [toast, setToast] = useState<Toast | null>(null);
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);

  const evilSet = useMemo(() => new Set(evilPositions), [evilPositions]);
  const letterStates = useMemo(() => buildLetterStates(guesses), [guesses]);

  useEffect(() => {
    document.body.classList.add("gameBackground");
    return () => document.body.classList.remove("gameBackground");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (status === "playing") {
      setXpSummary(null);
      return;
    }
    if (xpSummary) return;
    const wordsPlayed = guesses.length;
    const tilesPlaced = guesses.reduce((sum, guess) => sum + guess.word.length, 0);
    const modifiersRevealed = evilRevealed.size;
    const eligibleForXp = wordsPlayed >= 4;
    const xpGained = eligibleForXp
      ? computeXpGain({
          win: status === "won",
          wordsPlayed,
          tilesPlaced,
          modifiersRevealed,
        })
      : 0;
    const progression = loadProgression();
    const totalBefore = progression.totalXP;
    const levelBefore = computeLevelProgress(totalBefore).level;
    const totalXP = totalBefore + xpGained;
    saveProgression({ ...progression, totalXP });
    const levelAfter = computeLevelProgress(totalXP).level;
    setXpSummary({ xpGained, levelBefore, levelAfter, totalXP });
  }, [status, guesses, evilRevealed, xpSummary]);

  function resetGame() {
    setTargetWord(pickWordleTarget());
    setEvilPositions(pickEvilPositions());
    setEvilRevealed(new Set());
    setGuesses([]);
    setCurrentGuess("");
    setAttemptsLeft(WORDLE_ATTEMPTS);
    setStatus("playing");
    setToast(null);
    setXpSummary(null);
  }

  function showToast(text: string, tone: Toast["tone"] = "info") {
    setToast({ text, tone });
  }

  function applyGuess(guess: string) {
    const states = evaluateGuess(guess, targetWord);
    const newlyHit: number[] = [];
    const nextEvilRevealed = new Set(evilRevealed);

    states.forEach((state, idx) => {
      if (state === "correct" && evilSet.has(idx) && !nextEvilRevealed.has(idx)) {
        newlyHit.push(idx);
        nextEvilRevealed.add(idx);
      }
    });

    const penalty = newlyHit.length;
    const nextAttempts = Math.max(attemptsLeft - 1 - penalty, 0);

    setGuesses((prev) => [...prev, { word: guess, states, evilHits: newlyHit }]);
    setEvilRevealed(nextEvilRevealed);
    setAttemptsLeft(nextAttempts);
    setCurrentGuess("");

    if (penalty > 0) {
      showToast(`Evil letter revealed! -${penalty} attempt${penalty === 1 ? "" : "s"}.`, "danger");
    }

    if (guess === targetWord) {
      setStatus("won");
      return;
    }

    if (nextAttempts <= 0) {
      setStatus("lost");
    }
  }

  function submitGuess() {
    if (status !== "playing") return;
    const guess = currentGuess.toUpperCase();
    if (guess.length !== WORDLE_LENGTH) {
      showToast("Not enough letters.");
      return;
    }
    if (!isValidWordleGuess(guess)) {
      showToast("Not in dictionary.");
      return;
    }
    applyGuess(guess);
  }

  function handleKey(letter: string) {
    if (status !== "playing") return;
    if (currentGuess.length >= WORDLE_LENGTH) return;
    setCurrentGuess((prev) => (prev + letter).toUpperCase());
  }

  function handleBackspace() {
    if (status !== "playing") return;
    setCurrentGuess((prev) => prev.slice(0, -1));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (status !== "playing") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        handleKey(event.key.toUpperCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, currentGuess, attemptsLeft, targetWord, evilRevealed, evilSet]);

  const rows = useMemo(() => {
    const data = [] as Array<{ letters: string[]; states: (LetterState | "pending" | "empty")[]; evilHits: number[] }>;
    for (let i = 0; i < WORDLE_ATTEMPTS; i++) {
      if (i < guesses.length) {
        const result = guesses[i];
        data.push({
          letters: result.word.split(""),
          states: result.states,
          evilHits: result.evilHits,
        });
      } else if (i === guesses.length) {
        const letters = currentGuess.padEnd(WORDLE_LENGTH, " ").split("");
        data.push({
          letters,
          states: letters.map((ch) => (ch.trim() ? "pending" : "empty")),
          evilHits: [],
        });
      } else {
        data.push({
          letters: new Array(WORDLE_LENGTH).fill(""),
          states: new Array(WORDLE_LENGTH).fill("empty"),
          evilHits: [],
        });
      }
    }
    return data;
  }, [guesses, currentGuess]);

  return (
    <div className="screen screenFull wordleScreen">
      <div className="card wordleCard">
        <TopBar
          title="Word Sweeple"
          left={<Button onClick={props.onExit}>Home</Button>}
          right={<Button onClick={resetGame}>New</Button>}
        />
        <div className="wordleStatus">
          <span>Attempts left: {attemptsLeft}</span>
          <span>Hidden evil letters: {evilRevealed.size}/{evilPositions.length}</span>
        </div>
        {toast && (
          <div className={`wordleToast ${toast.tone === "danger" ? "danger" : ""}`}>
            {toast.text}
          </div>
        )}
        <div className="wordleGrid" style={{ ["--wordle-length" as any]: WORDLE_LENGTH }}>
          {rows.map((row, rowIdx) => (
            <div key={`row-${rowIdx}`} className="wordleRow">
              {row.letters.map((letter, colIdx) => {
                const state = row.states[colIdx];
                const isRevealed = evilRevealed.has(colIdx);
                const isHit = row.evilHits.includes(colIdx);
                return (
                  <div
                    key={`cell-${rowIdx}-${colIdx}`}
                    className={`wordleCell ${state} ${isRevealed ? "evil-revealed" : ""} ${isHit ? "evil-hit" : ""}`}
                    style={
                      state !== "empty"
                        ? {
                            backgroundImage: `url(${tileBase})`,
                          }
                        : undefined
                    }
                  >
                    {letter.trim()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="wordleKeyboard">
          <div className="wordleActionRow">
            <button className="wordleKey wide" type="button" onClick={submitGuess}>
              Enter
            </button>
            <button className="wordleKey wide" type="button" onClick={handleBackspace}>
              Del
            </button>
          </div>
          {KEYBOARD_ROWS.map((row, idx) => (
            <div key={`kb-${idx}`} className="wordleKeyboardRow">
              {row.split("").map((letter) => (
                <button
                  key={letter}
                  className={`wordleKey ${letterStates[letter] ?? ""}`}
                  type="button"
                  onClick={() => handleKey(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>
        {status !== "playing" && (
          <div className="wordleOverlay">
            <div className="wordleResultCard">
              <div className="wordleResultTitle">{status === "won" ? "You guessed it!" : "Out of attempts"}</div>
              <div className="wordleResultWord">Word: {targetWord}</div>
              {xpSummary && (
                <div className="gameOverXp">
                  <div className="xpGain">+{xpSummary.xpGained} XP</div>
                  <div className={"xpLevel" + (xpSummary.levelAfter > xpSummary.levelBefore ? " levelUp" : "")}>
                    {xpSummary.levelAfter > xpSummary.levelBefore
                      ? `Level Up! ${xpSummary.levelBefore} -> ${xpSummary.levelAfter}`
                      : `Level ${xpSummary.levelAfter}`}
                  </div>
                  <div className="xpTotal">Total XP: {xpSummary.totalXP}</div>
                </div>
              )}
              <div className="wordleResultActions">
                <button type="button" className="confirmBtn primary" onClick={resetGame}>
                  Play Again
                </button>
                <button type="button" className="confirmBtn" onClick={props.onExit}>
                  Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


