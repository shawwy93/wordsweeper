import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Board from "../components/Board";
import Rack from "../components/Rack";
import ScorePanel from "../components/ScorePanel";
import { Difficulty, PlacedTile, Tile, GameState } from "../game/types";
import { createNewGame, rebalanceRack } from "../game/state";
import { applyRevealThisTurn, scoreTurn } from "../game/scoring";
import { createTileBag, RACK_SIZE } from "../game/constants";
import { chooseAiMove } from "../game/ai";
import { validateMove, type WordPlay } from "../game/validation";
import { recordGameResult, recordGameStart, recordMoveStats } from "../game/stats";
import tileBase from "../assets/tile-base.png";

import placeAudioSrc from "../assets/audio/placeAudio.mp3";
import shuffleAudioSrc from "../assets/audio/shuffleAudio.mp3";
import buttonAudioSrc from "../assets/audio/buttonAudio.mp3";
import loseAudioSrc from "../assets/audio/loseAudio.mp3";
import winAudioSrc from "../assets/audio/winAudio.mp3";

const TOTAL_TILES = createTileBag().length;
const AI_DELAY_MS = 650;
const TOUCH_DRAG_THRESHOLD = 6;
const MAX_SWAPS = 3;

type PlayModalState =
  | { type: "confirm"; words: WordPlay[]; points: number }
  | { type: "invalid"; words: WordPlay[]; reason: string }
  | null;

type MoveEntry = {
  id: string;
  player: "You" | "AI";
  words: string[];
  points: number;
  action?: "pass" | "swap";
};

type MatchStats = {
  playerMoves: number;
  aiMoves: number;
  playerWords: number;
  aiWords: number;
  playerTiles: number;
  aiTiles: number;
  playerPoints: number;
  aiPoints: number;
  bestMove: number;
};

type PassStreak = {
  player: number;
  ai: number;
};

type GameOverState = {
  winner: "You" | "AI" | "Tie";
  reason: string;
  scores: { player: number; ai: number };
  stats: MatchStats;
};

type BlankPick = {
  tileId: string;
  x: number;
  y: number;
  swapTargetId?: string;
};

type TouchDrag = {
  tileId: string;
  source: "rack" | "board";
  x: number;
  y: number;
  width: number;
  height: number;
};

type PendingTouchDrag = {
  tileId: string;
  source: "rack" | "board";
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  element: HTMLElement;
  started: boolean;
};

const BLANK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const EMPTY_MATCH_STATS: MatchStats = {
  playerMoves: 0,
  aiMoves: 0,
  playerWords: 0,
  aiWords: 0,
  playerTiles: 0,
  aiTiles: 0,
  playerPoints: 0,
  aiPoints: 0,
  bestMove: 0,
};
const EMPTY_PASS_STREAK: PassStreak = { player: 0, ai: 0 };

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function refillRack(rack: Tile[], bag: Tile[]) {
  const needed = Math.max(RACK_SIZE - rack.length, 0);
  const take = bag.slice(0, needed);
  const rest = bag.slice(needed);
  return rebalanceRack([...rack, ...take], rest);
}

function applyAiPlacements(g: GameState, placements: PlacedTile[]) {
  const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
  const newAiRack = [...g.aiRack];

  for (const p of placements) {
    const cell = newBoard[p.y]?.[p.x];
    if (!cell || cell.tileId) return null;
    const idx = newAiRack.findIndex((t) => t.id === p.tileId);
    if (idx === -1) return null;
    newAiRack.splice(idx, 1);
    cell.tileId = p.tileId;
    cell.letterOverride = p.letterOverride;
  }

  return {
    ...g,
    board: newBoard,
    aiRack: newAiRack,
    placedThisTurn: placements,
  };
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5 19c1.8-3.2 12.2-3.2 14 0" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h10v4a5 5 0 0 1-10 0V5z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5 7h2v2a4 4 0 0 1-2-2zM17 7h2v2a4 4 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M10 19h4M9 21h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconShuffle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h4l3 4 3-4h6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M18 7l2 2-2 2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 17h4l3-4 3 4h6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M18 17l2-2-2-2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10l-3-3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M17 17H7l3 3" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function IconUndo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7H4v5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 12c2.2-3 6.5-4 10-2 2.8 1.5 4 4.5 3 7" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function IconPass() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6l10 6-10 6V6z" fill="currentColor" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconRecall() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v8" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12M6 12h12M6 17h8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconButton(props: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`iconButton ${props.className ?? ""}`}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.label}
      title={props.label}
    >
      <span className="iconGlyph">{props.children}</span>
      {props.label && <span className="iconLabel">{props.label}</span>}
    </button>
  );
}

function WordTiles(props: { word: string }) {
  return (
    <div className="wordTiles">
      {props.word.split("").map((ch, idx) => (
        <div
          key={`${ch}-${idx}`}
          className="wordTile"
          style={{
            backgroundImage: `url(${tileBase})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

function clearPlayerPlacements(g: GameState) {
  if (g.placedThisTurn.length === 0) return g;
  const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
  const restored: Tile[] = [];

  for (const placed of g.placedThisTurn) {
    newBoard[placed.y][placed.x].tileId = undefined;
    newBoard[placed.y][placed.x].letterOverride = undefined;
    const tile = g.tilesById[placed.tileId];
    if (tile) restored.push(tile);
  }

  return {
    ...g,
    board: newBoard,
    rack: [...g.rack, ...restored],
    placedThisTurn: [],
  };
}

export default function GameScreen(props: { difficulty: Difficulty; onExit: () => void }) {
  const [game, setGame] = useState(() => createNewGame(props.difficulty));
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showHiddenHints, setShowHiddenHints] = useState(false);
  const [turn, setTurn] = useState(1);
  const [playModal, setPlayModal] = useState<PlayModalState>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveEntry[]>([]);
  const [blankPicker, setBlankPicker] = useState<BlankPick | null>(null);
  const [gameOver, setGameOver] = useState<GameOverState | null>(null);
  const [scorelessTurns, setScorelessTurns] = useState(0);
  const [matchStats, setMatchStats] = useState<MatchStats>({ ...EMPTY_MATCH_STATS });
  const [touchDrag, setTouchDrag] = useState<TouchDrag | null>(null);
  const [passStreak, setPassStreak] = useState<PassStreak>({ ...EMPTY_PASS_STREAK });
  const [swapsUsed, setSwapsUsed] = useState(0);
  const pendingTouchRef = useRef<PendingTouchDrag | null>(null);
  const aiQueuedRef = useRef(false);
  const gameRef = useRef<GameState>(game);
  const matchStatsRef = useRef<MatchStats>(matchStats);
  const scorelessRef = useRef(scorelessTurns);
  const passStreakRef = useRef<PassStreak>(passStreak);
  const gameOverRef = useRef(gameOver);

  const audioRef = useRef<{
    place: HTMLAudioElement;
    shuffle: HTMLAudioElement;
    button: HTMLAudioElement;
    win: HTMLAudioElement;
    lose: HTMLAudioElement;
  } | null>(null);

  if (!audioRef.current) {
    audioRef.current = {
      place: new Audio(placeAudioSrc),
      shuffle: new Audio(shuffleAudioSrc),
      button: new Audio(buttonAudioSrc),
      win: new Audio(winAudioSrc),
      lose: new Audio(loseAudioSrc),
    };
    Object.values(audioRef.current).forEach((audio) => {
      audio.preload = "auto";
    });
  }

  function playSound(audio?: HTMLAudioElement) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => undefined);
      }
    } catch {
      return;
    }
  }

  function playPlaceSound() {
    playSound(audioRef.current?.place);
  }

  function playShuffleSound() {
    playSound(audioRef.current?.shuffle);
  }

  function playButtonSound() {
    playSound(audioRef.current?.button);
  }


  function playWinSound() {
    playSound(audioRef.current?.win);
  }

  function playLoseSound() {
    playSound(audioRef.current?.lose);
  }

  useEffect(() => {
    document.body.classList.add("gameBackground");
    return () => document.body.classList.remove("gameBackground");
  }, []);

  useEffect(() => {
    recordGameStart();
  }, []);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    matchStatsRef.current = matchStats;
  }, [matchStats]);

  useEffect(() => {
    scorelessRef.current = scorelessTurns;
  }, [scorelessTurns]);

  useEffect(() => {
    passStreakRef.current = passStreak;
  }, [passStreak]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const pending = pendingTouchRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      const dx = event.clientX - pending.startX;
      const dy = event.clientY - pending.startY;
      const distance = Math.hypot(dx, dy);
      if (!pending.started && distance < TOUCH_DRAG_THRESHOLD) return;
      if (!pending.started) {
        pending.started = true;
      }
      event.preventDefault();
      setTouchDrag({
        tileId: pending.tileId,
        source: pending.source,
        x: event.clientX - pending.offsetX,
        y: event.clientY - pending.offsetY,
        width: pending.width,
        height: pending.height,
      });
    }

    function handlePointerEnd(event: PointerEvent) {
      const pending = pendingTouchRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      pendingTouchRef.current = null;
      if (pending.element.hasPointerCapture(event.pointerId)) {
        pending.element.releasePointerCapture(event.pointerId);
      }
      if (!pending.started) return;
      event.preventDefault();
      setTouchDrag(null);
      handleTouchDrop(pending.tileId, pending.source, event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, []);

  const placedThisTurn = useMemo(
    () => game.placedThisTurn,
    [game.placedThisTurn]
  );

  const selectedTile = selectedTileId ? game.tilesById[selectedTileId] : null;
  const tilesPlaced = useMemo(
    () => Math.max(TOTAL_TILES - (game.bag.length + game.rack.length + game.aiRack.length), 0),
    [game.bag.length, game.rack.length, game.aiRack.length]
  );
  const dragTile = touchDrag ? game.tilesById[touchDrag.tileId] : null;

  const canInteract = isPlayerTurn && !aiBusy && !gameOver;
  const canPlay = canInteract && placedThisTurn.length > 0;
  const selectedRackTile = selectedTileId ? game.rack.some((t) => t.id === selectedTileId) : false;
  const canSwap =
    canInteract &&
    placedThisTurn.length === 0 &&
    game.bag.length > 0 &&
    swapsUsed < MAX_SWAPS &&
    selectedRackTile;

  function recordMove(
    player: "You" | "AI",
    words: WordPlay[],
    points: number,
    action?: "pass" | "swap"
  ) {
    const entryWords = words.map((w) => w.text);
    setMoveHistory((prev) => {
      const last = prev[0];
      if (
        last &&
        last.player === player &&
        last.points === points &&
        last.words.join("|") === entryWords.join("|") &&
        last.action === action
      ) {
        return prev;
      }
      const entry: MoveEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        player,
        words: entryWords,
        points,
        action,
      };
      return [entry, ...prev].slice(0, 40);
    });
  }

  function recordMatchMove(params: {
    player: "You" | "AI";
    words: number;
    points: number;
    tiles: number;
  }) {
    const next = { ...matchStatsRef.current };
    if (params.player === "You") {
      next.playerMoves += 1;
      next.playerWords += params.words;
      next.playerTiles += params.tiles;
      next.playerPoints += params.points;
    } else {
      next.aiMoves += 1;
      next.aiWords += params.words;
      next.aiTiles += params.tiles;
      next.aiPoints += params.points;
    }
    if (params.points > next.bestMove) next.bestMove = params.points;
    matchStatsRef.current = next;
    setMatchStats(next);
    return next;
  }

  function updateScoreless(points: number) {
    const next = points === 0 ? scorelessRef.current + 1 : 0;
    scorelessRef.current = next;
    setScorelessTurns(next);
    return next;
  }

  function resetScoreless() {
    if (scorelessRef.current === 0) return 0;
    scorelessRef.current = 0;
    setScorelessTurns(0);
    return 0;
  }

  function updatePassStreak(player: "You" | "AI", didPass: boolean) {
    const next = { ...passStreakRef.current };
    if (player === "You") {
      next.player = didPass ? next.player + 1 : 0;
    } else {
      next.ai = didPass ? next.ai + 1 : 0;
    }
    passStreakRef.current = next;
    setPassStreak(next);
    return next;
  }

  function computeWinner(scores: { player: number; ai: number }) {
    if (scores.player > scores.ai) return "You" as const;
    if (scores.ai > scores.player) return "AI" as const;
    return "Tie" as const;
  }

  function handleGameOver(nextGame: GameState, reason: string, stats: MatchStats, winner?: "You" | "AI" | "Tie") {
    const finalWinner = winner ?? computeWinner(nextGame.scores);
    if (finalWinner === "You") playWinSound();
    if (finalWinner === "AI") playLoseSound();
    setGameOver({
      winner: finalWinner,
      reason,
      scores: { ...nextGame.scores },
      stats,
    });
    setPlayModal(null);
    setBlankPicker(null);
    setShowMoreMenu(false);
    setShowHistory(false);
    setTouchDrag(null);
    pendingTouchRef.current = null;
    if (finalWinner === "You") recordGameResult("win");
    if (finalWinner === "AI") recordGameResult("loss");
    aiQueuedRef.current = false;
    setAiBusy(false);
    setIsPlayerTurn(true);
  }

  function checkGameOver(
    nextGame: GameState,
    nextScoreless: number,
    stats: MatchStats,
    nextPassStreak: PassStreak = passStreakRef.current
  ) {
    if (gameOverRef.current) return true;
    if (nextPassStreak.player >= 3) {
      handleGameOver(nextGame, "You passed three turns in a row.", stats);
      return true;
    }
    if (nextPassStreak.ai >= 3) {
      handleGameOver(nextGame, "AI passed three turns in a row.", stats);
      return true;
    }
    const bagEmpty = nextGame.bag.length === 0;
    const playerEmpty = nextGame.rack.length === 0;
    const aiEmpty = nextGame.aiRack.length === 0;
    if (bagEmpty && (playerEmpty || aiEmpty)) {
      const winner = playerEmpty && aiEmpty ? undefined : playerEmpty ? "You" : "AI";
      handleGameOver(nextGame, "Tile bag empty and rack emptied.", stats, winner);
      return true;
    }
    if (nextScoreless >= 3 && (nextGame.scores.player > 0 || nextGame.scores.ai > 0)) {
      handleGameOver(nextGame, "Three scoreless turns in a row.", stats);
      return true;
    }
    return false;
  }

  function swapRackTiles(sourceId: string, targetId: string) {
    if (!canInteract) return;
    if (sourceId === targetId) return;
    setGame((g) => {
      const sourceIndex = g.rack.findIndex((t) => t.id === sourceId);
      const targetIndex = g.rack.findIndex((t) => t.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return g;
      const newRack = [...g.rack];
      [newRack[sourceIndex], newRack[targetIndex]] = [newRack[targetIndex], newRack[sourceIndex]];
      return { ...g, rack: newRack };
    });
  }

  function swapRackWithPlaced(
    rackTileId: string,
    targetTileId: string,
    x: number,
    y: number,
    letterOverride?: string
  ) {
    let didSwap = false;
    setGame((g) => {
      const rackIndex = g.rack.findIndex((t) => t.id === rackTileId);
      const targetPlaced = g.placedThisTurn.find((p) => p.tileId === targetTileId);
      if (rackIndex === -1 || !targetPlaced) return g;
      const targetCell = g.board[y]?.[x];
      if (!targetCell || targetCell.tileId !== targetTileId) return g;

      const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
      const newRack = [...g.rack];
      const rackTile = newRack[rackIndex];
      newRack[rackIndex] = g.tilesById[targetTileId];

      const targetCellCopy = newBoard[y][x];
      targetCellCopy.tileId = rackTileId;
      targetCellCopy.letterOverride = letterOverride;

      const newPlaced = g.placedThisTurn.map((p) =>
        p.tileId === targetTileId ? { ...p, tileId: rackTileId, x, y } : p
      );

      didSwap = true;
      return {
        ...g,
        board: newBoard,
        rack: newRack,
        placedThisTurn: newPlaced,
      };
    });
    if (didSwap) playPlaceSound();
  }


  function swapPlacedTiles(sourceId: string, targetId: string) {
    if (!canInteract) return;
    if (sourceId === targetId) return;
    let didSwap = false;
    setGame((g) => {
      const sourcePlaced = g.placedThisTurn.find((p) => p.tileId === sourceId);
      const targetPlaced = g.placedThisTurn.find((p) => p.tileId === targetId);
      if (!sourcePlaced || !targetPlaced) return g;

      const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
      const sourceCell = newBoard[sourcePlaced.y]?.[sourcePlaced.x];
      const targetCell = newBoard[targetPlaced.y]?.[targetPlaced.x];
      if (!sourceCell || !targetCell) return g;

      const sourceOverride = sourceCell.letterOverride;
      const targetOverride = targetCell.letterOverride;

      sourceCell.tileId = targetId;
      sourceCell.letterOverride = targetOverride;
      targetCell.tileId = sourceId;
      targetCell.letterOverride = sourceOverride;

      const newPlaced = g.placedThisTurn.map((p) => {
        if (p.tileId === sourceId) return { ...p, x: targetPlaced.x, y: targetPlaced.y };
        if (p.tileId === targetId) return { ...p, x: sourcePlaced.x, y: sourcePlaced.y };
        return p;
      });

      didSwap = true;
      return { ...g, board: newBoard, placedThisTurn: newPlaced };
    });
    if (didSwap) playPlaceSound();
  }

  function beginTouchDrag(
    tileId: string,
    source: "rack" | "board",
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (!canInteract) return;
    if (event.pointerType === "mouse") return;
    if (pendingTouchRef.current) return;
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    pendingTouchRef.current = {
      tileId,
      source,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      element,
      started: false,
    };
    element.setPointerCapture(event.pointerId);
    setSelectedTileId(null);
  }

  function handleTouchDrop(
    tileId: string,
    source: "rack" | "board",
    clientX: number,
    clientY: number
  ) {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!target) return;

    const boardCell = target.closest("[data-board-x][data-board-y]") as HTMLElement | null;
    if (boardCell) {
      const x = Number(boardCell.dataset.boardX);
      const y = Number(boardCell.dataset.boardY);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        onBoardDrop(tileId, source, x, y);
        return;
      }
    }

    if (source === "rack") {
      const rackTile = target.closest("[data-rack-tile='true']") as HTMLElement | null;
      const targetId = rackTile?.dataset.tileId;
      if (targetId && targetId !== tileId) {
        swapRackTiles(tileId, targetId);
        return;
      }
    }

    if (source === "board") {
      const rackDrop = target.closest("[data-rack-drop='true']") as HTMLElement | null;
      if (rackDrop) removePlacedTile(tileId);
    }
  }

  function handleExit() {
    playButtonSound();
    props.onExit();
  }

  function openHistory() {
    playButtonSound();
    setShowHistory(true);
  }

  function closeHistory() {
    playButtonSound();
    setShowHistory(false);
  }

  function openMoreMenu() {
    playButtonSound();
    setShowMoreMenu(true);
  }

  function closeMoreMenu() {
    playButtonSound();
    setShowMoreMenu(false);
  }

  function toggleHiddenHints() {
    if (!canInteract) return;
    playButtonSound();
    setShowHiddenHints((v) => !v);
  }

  function closePlayModal() {
    playButtonSound();
    setPlayModal(null);
  }

  function closeBlankPicker() {
    playButtonSound();
    setBlankPicker(null);
  }

  function onSelectRackTile(tileId: string) {
    if (!canInteract) return;
    setSelectedTileId((prev) => (prev === tileId ? null : tileId));
  }

  function placeTileAt(tileId: string, x: number, y: number, letterOverride?: string) {
    if (!canInteract) return;
    const tileMeta = game.tilesById[tileId];
    let didPlace = false;
    const alreadyPlaced = game.placedThisTurn.find((p) => p.tileId === tileId);
    if (tileMeta?.isBlank && !alreadyPlaced && !letterOverride) {
      setBlankPicker({ tileId, x, y });
      setSelectedTileId(null);
      return;
    }
    setGame((g) => {
      const cell = g.board[y][x];
      if (!cell || cell.tileId) return g;

      const existingPlaced = g.placedThisTurn.find((p) => p.tileId === tileId);
      if (existingPlaced) {
        if (existingPlaced.x === x && existingPlaced.y === y) return g;
        const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
        const prevOverride = newBoard[existingPlaced.y][existingPlaced.x].letterOverride;
        newBoard[existingPlaced.y][existingPlaced.x].tileId = undefined;
        newBoard[existingPlaced.y][existingPlaced.x].letterOverride = undefined;
        if (newBoard[y][x].tileId) return g;
        newBoard[y][x].tileId = tileId;
        newBoard[y][x].letterOverride = letterOverride ?? prevOverride;
        const newPlaced = g.placedThisTurn.map((p) =>
          p.tileId === tileId ? { ...p, x, y } : p
        );
        didPlace = true;
        return {
          ...g,
          board: newBoard,
          placedThisTurn: newPlaced,
        };
      }

      const tileIndex = g.rack.findIndex((t) => t.id === tileId);
      if (tileIndex === -1) return g;

      const tile = g.rack[tileIndex];
      const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
      newBoard[y][x].tileId = tile.id;
      newBoard[y][x].letterOverride = letterOverride;

      const newRack = g.rack.filter((t) => t.id !== tile.id);
      const newPlaced: PlacedTile[] = [...g.placedThisTurn, { tileId: tile.id, x, y }];

      didPlace = true;
      return {
        ...g,
        board: newBoard,
        rack: newRack,
        placedThisTurn: newPlaced,
      };
    });

    if (didPlace) playPlaceSound();
    setSelectedTileId(null);
  }

  function removePlacedTile(tileId: string) {
    if (!canInteract) return;
    setGame((g) => {
      const idx = g.placedThisTurn.findIndex((p) => p.tileId === tileId);
      if (idx === -1) return g;
      const placed = g.placedThisTurn[idx];
      const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
      newBoard[placed.y][placed.x].tileId = undefined;
      newBoard[placed.y][placed.x].letterOverride = undefined;
      const tile = g.tilesById[tileId];
      const newRack = tile ? [...g.rack, tile] : g.rack;
      return {
        ...g,
        board: newBoard,
        rack: newRack,
        placedThisTurn: g.placedThisTurn.filter((p) => p.tileId !== tileId),
      };
    });
  }

  function onRackDragStart(tileId: string, event: DragEvent<HTMLDivElement>) {
    if (!canInteract) return;
    event.dataTransfer.setData("text/plain", tileId);
    event.dataTransfer.setData("application/x-tile-source", "rack");
    event.dataTransfer.effectAllowed = "move";
    setSelectedTileId(null);
  }

  function onRackDrop(tileId: string, source: "rack" | "board") {
    if (!canInteract) return;
    if (source === "board") {
      removePlacedTile(tileId);
    }
  }

  function onBoardDrop(tileId: string, source: "rack" | "board", x: number, y: number) {
    if (!canInteract) return;
    const current = gameRef.current;
    if (!current) return;
    const cell = current.board[y]?.[x];
    if (!cell) return;

    if (!cell.tileId) {
      placeTileAt(tileId, x, y);
      return;
    }

    const targetId = cell.tileId;
    const targetPlaced = current.placedThisTurn.find((p) => p.tileId === targetId);
    if (!targetPlaced) return;

    if (source === "board") {
      const sourcePlaced = current.placedThisTurn.find((p) => p.tileId === tileId);
      if (!sourcePlaced) return;
      swapPlacedTiles(tileId, targetId);
      return;
    }

    const rackTile = current.rack.find((t) => t.id === tileId);
    if (rackTile?.isBlank) {
      setBlankPicker({ tileId, x, y, swapTargetId: targetId });
      setSelectedTileId(null);
      return;
    }
    swapRackWithPlaced(tileId, targetId, x, y);
  }

  function onTapSquare(x: number, y: number) {
    if (!canInteract) return;
    if (!selectedTileId) return;
    placeTileAt(selectedTileId, x, y);
  }

  function confirmBlankLetter(letter: string) {
    if (!blankPicker) return;
    playButtonSound();
    const { tileId, x, y, swapTargetId } = blankPicker;
    setBlankPicker(null);
    if (swapTargetId) {
      swapRackWithPlaced(tileId, swapTargetId, x, y, letter);
    } else {
      placeTileAt(tileId, x, y, letter);
    }
    setSelectedTileId(null);
  }

  function undo() {
    if (!canInteract) return;
    playButtonSound();
    setGame((g) => {
      if (g.placedThisTurn.length === 0) return g;
      const last = g.placedThisTurn[g.placedThisTurn.length - 1];

      const newBoard = g.board.map((row) => row.map((c) => ({ ...c })));
      newBoard[last.y][last.x].tileId = undefined;
      newBoard[last.y][last.x].letterOverride = undefined;

      const tile = g.tilesById[last.tileId];
      const newRack = tile ? [...g.rack, tile] : g.rack;

      return {
        ...g,
        board: newBoard,
        rack: newRack,
        placedThisTurn: g.placedThisTurn.slice(0, -1),
      };
    });
  }

  function recallTurn() {
    if (!canInteract) return;
    playButtonSound();
    setGame((g) => clearPlayerPlacements(g));
    setSelectedTileId(null);
  }

  function shuffleRack() {
    if (!canInteract) return;
    playButtonSound();
    playShuffleSound();
    setGame((g) => ({
      ...g,
      rack: shuffle(g.rack),
    }));
  }

  function swapRack() {
    if (!canSwap) return;
    playButtonSound();
    const current = gameRef.current;
    if (!current) return;
    const selectedId = selectedTileId;
    if (!selectedId) return;
    const tileIndex = current.rack.findIndex((t) => t.id === selectedId);
    if (tileIndex === -1) return;
    if (current.bag.length === 0) return;

    const bagIndex = Math.floor(Math.random() * current.bag.length);
    const incoming = current.bag[bagIndex];
    const newBag = [...current.bag];
    newBag.splice(bagIndex, 1);
    const swappedOut = current.rack[tileIndex];
    const insertIndex = Math.floor(Math.random() * (newBag.length + 1));
    newBag.splice(insertIndex, 0, swappedOut);
    const newRack = [...current.rack];
    newRack[tileIndex] = incoming;
    const nextGame = {
      ...current,
      rack: newRack,
      bag: newBag,
      placedThisTurn: [],
    };
    setGame(nextGame);
    setSelectedTileId(null);
    setSwapsUsed((prev) => prev + 1);
    recordMoveStats({ player: "You", words: 0, points: 0, tiles: 0 });
    const nextStats = recordMatchMove({ player: "You", words: 0, points: 0, tiles: 0 });
    recordMove("You", [], 0, "swap");
    resetScoreless();
    const nextPassStreak = updatePassStreak("You", false);
    if (checkGameOver(nextGame, scorelessRef.current, nextStats, nextPassStreak)) return;
    setTurn((t) => t + 1);
    queueAiMove();
  }

  function openSubmitModal() {
    if (!canInteract) return;
    const result = validateMove(game);
    if (!result.ok) {
      setPlayModal({ type: "invalid", reason: result.reason, words: result.words ?? [] });
      return;
    }

    const points = scoreTurn(game, result.words);
    setPlayModal({ type: "confirm", words: result.words, points });
  }

  function queueAiMove() {
    if (gameOverRef.current) return;
    if (aiQueuedRef.current) return;
    aiQueuedRef.current = true;
    setAiBusy(true);
    setIsPlayerTurn(false);

    setTimeout(() => {
      if (gameOverRef.current) {
        aiQueuedRef.current = false;
        setAiBusy(false);
        setIsPlayerTurn(true);
        return;
      }
      const current = gameRef.current;
      if (!current) {
        aiQueuedRef.current = false;
        setAiBusy(false);
        setIsPlayerTurn(true);
        return;
      }

      const move = chooseAiMove(current);
      if (!move) {
        const nextGame = { ...current, placedThisTurn: [] };
        setGame(nextGame);
        recordMoveStats({ player: "AI", words: 0, points: 0, tiles: 0 });
        const nextStats = recordMatchMove({ player: "AI", words: 0, points: 0, tiles: 0 });
        recordMove("AI", [], 0, "pass");
        const nextScoreless = updateScoreless(0);
        const nextPassStreak = updatePassStreak("AI", true);
        if (!checkGameOver(nextGame, nextScoreless, nextStats, nextPassStreak)) {
          setTurn((t) => t + 1);
          setAiBusy(false);
          setIsPlayerTurn(true);
        }
        aiQueuedRef.current = false;
        return;
      }

      const sim = applyAiPlacements(current, move.placements);
      if (!sim) {
        const nextGame = { ...current, placedThisTurn: [] };
        setGame(nextGame);
        recordMoveStats({ player: "AI", words: 0, points: 0, tiles: 0 });
        const nextStats = recordMatchMove({ player: "AI", words: 0, points: 0, tiles: 0 });
        recordMove("AI", [], 0, "pass");
        const nextScoreless = updateScoreless(0);
        const nextPassStreak = updatePassStreak("AI", true);
        if (!checkGameOver(nextGame, nextScoreless, nextStats, nextPassStreak)) {
          setTurn((t) => t + 1);
          setAiBusy(false);
          setIsPlayerTurn(true);
        }
        aiQueuedRef.current = false;
        return;
      }

      const validation = validateMove(sim);
      if (!validation.ok) {
        const nextGame = { ...current, placedThisTurn: [] };
        setGame(nextGame);
        recordMoveStats({ player: "AI", words: 0, points: 0, tiles: 0 });
        const nextStats = recordMatchMove({ player: "AI", words: 0, points: 0, tiles: 0 });
        recordMove("AI", [], 0, "pass");
        const nextScoreless = updateScoreless(0);
        const nextPassStreak = updatePassStreak("AI", true);
        if (!checkGameOver(nextGame, nextScoreless, nextStats, nextPassStreak)) {
          setTurn((t) => t + 1);
          setAiBusy(false);
          setIsPlayerTurn(true);
        }
        aiQueuedRef.current = false;
        return;
      }

      const points = scoreTurn(sim, validation.words);
      recordMoveStats({
        player: "AI",
        words: validation.words.length,
        points,
        tiles: move.placements.length,
      });
      const nextStats = recordMatchMove({
        player: "AI",
        words: validation.words.length,
        points,
        tiles: move.placements.length,
      });
      recordMove("AI", validation.words, points);
      const { nextBoard } = applyRevealThisTurn(sim);
      const refill = refillRack(sim.aiRack, sim.bag);

      const nextGame = {
        ...sim,
        board: nextBoard,
        aiRack: refill.rack,
        bag: refill.bag,
        lastPlayedIds: move.placements.map((p) => p.tileId),
        scores: { ...sim.scores, ai: sim.scores.ai + points },
        placedThisTurn: [],
        lastRevealAnim: Date.now(),
      };
      setGame(nextGame);
      const nextScoreless = updateScoreless(points);
      const nextPassStreak = updatePassStreak("AI", false);
      if (!checkGameOver(nextGame, nextScoreless, nextStats, nextPassStreak)) {
        setTurn((t) => t + 1);
        setAiBusy(false);
        setIsPlayerTurn(true);
      }
      aiQueuedRef.current = false;
    }, AI_DELAY_MS);
  }

  function commitTurn(words: WordPlay[], points: number) {
    playButtonSound();
    const current = gameRef.current;
    if (!current) return;
    recordMoveStats({
      player: "You",
      words: words.length,
      points,
      tiles: current.placedThisTurn.length,
    });
    const nextStats = recordMatchMove({
      player: "You",
      words: words.length,
      points,
      tiles: current.placedThisTurn.length,
    });
    recordMove("You", words, points);
    const { nextBoard } = applyRevealThisTurn(current);
    const refill = refillRack(current.rack, current.bag);
    const lastPlayedIds = current.placedThisTurn.map((p) => p.tileId);
    const nextGame = {
      ...current,
      board: nextBoard,
      rack: refill.rack,
      bag: refill.bag,
      lastPlayedIds,
      scores: { ...current.scores, player: current.scores.player + points },
      placedThisTurn: [],
      lastRevealAnim: Date.now(),
    };
    setGame(nextGame);
    setSelectedTileId(null);
    setPlayModal(null);
    const nextScoreless = updateScoreless(points);
    const nextPassStreak = updatePassStreak("You", false);
    if (checkGameOver(nextGame, nextScoreless, nextStats, nextPassStreak)) return;
    setTurn((t) => t + 1);
    queueAiMove();
  }

  function passTurn() {
    if (!canInteract) return;
    playButtonSound();
    const current = gameRef.current;
    if (!current) return;
    const nextGame = clearPlayerPlacements(current);
    setGame(nextGame);
    setSelectedTileId(null);
    recordMoveStats({ player: "You", words: 0, points: 0, tiles: 0 });
    const nextStats = recordMatchMove({ player: "You", words: 0, points: 0, tiles: 0 });
    recordMove("You", [], 0, "pass");
    const nextScoreless = updateScoreless(0);
    const nextPassStreak = updatePassStreak("You", true);
    if (checkGameOver(nextGame, nextScoreless, nextStats, nextPassStreak)) return;
    setTurn((t) => t + 1);
    queueAiMove();
  }

  function resignGame() {
    if (gameOver) return;
    playButtonSound();
    const current = gameRef.current;
    if (!current) return;
    setPlayModal(null);
    setShowMoreMenu(false);
    handleGameOver(current, "You resigned.", matchStatsRef.current, "AI");
  }

  function newMatch() {
    playButtonSound();
    setSelectedTileId(null);
    setShowHiddenHints(false);
    setTurn(1);
    setPlayModal(null);
    setIsPlayerTurn(true);
    setAiBusy(false);
    setShowHistory(false);
    setMoveHistory([]);
    setTouchDrag(null);
    pendingTouchRef.current = null;
    aiQueuedRef.current = false;
    setBlankPicker(null);
    setGameOver(null);
    gameOverRef.current = null;
    setScorelessTurns(0);
    setMatchStats({ ...EMPTY_MATCH_STATS });
    matchStatsRef.current = { ...EMPTY_MATCH_STATS };
    scorelessRef.current = 0;
    setPassStreak({ ...EMPTY_PASS_STREAK });
    passStreakRef.current = { ...EMPTY_PASS_STREAK };
    setSwapsUsed(0);
    recordGameStart();
    setGame(createNewGame(props.difficulty));
  }

  return (
    <div className="screen screenFull">
      <div className="gameShell desktopShell">
        <aside className="leftRail">
          <div className="leftNav">
            <button className="navItem" type="button" onClick={handleExit} aria-label="Home">
              <IconMenu />
              <span>Home</span>
            </button>
            <button className="navItem" type="button" aria-label="Moves" onClick={openHistory}>
              <IconUser />
              <span>Moves</span>
            </button>
            <button className="navItem" type="button" aria-label="Leaderboard">
              <IconTrophy />
              <span>Ranks</span>
            </button>
          </div>

          <div className="panelCard">
            <div className="panelTitle">Session</div>
            <ScorePanel scores={game.scores} bagCount={game.bag.length} />
            <div className="small">Difficulty: {props.difficulty.toUpperCase()}</div>
            <div className="small">Board: 11x11 | Turn {turn}</div>
            <div className="small">{isPlayerTurn ? "Your move" : "AI move"}</div>
          </div>

          <div className="panelCard">
            <div className="panelTitle">Actions</div>
            <div className="actionList">
              <IconButton label="New Match" onClick={newMatch}>
                <IconPlus />
              </IconButton>
              <IconButton label="Shuffle Rack" onClick={shuffleRack} disabled={!canInteract}>
                <IconShuffle />
              </IconButton>
              <IconButton label="Swap Tiles" onClick={swapRack} disabled={!canSwap}>
                <IconSwap />
              </IconButton>
              <IconButton label="Pass" onClick={passTurn} disabled={!canInteract}>
                <IconPass />
              </IconButton>
              <IconButton label="Undo Last" onClick={undo} disabled={!canInteract || placedThisTurn.length === 0}>
                <IconUndo />
              </IconButton>
              <IconButton label="Recall Turn" onClick={recallTurn} disabled={!canInteract || placedThisTurn.length === 0}>
                <IconRecall />
              </IconButton>
              <IconButton label="Resign" onClick={resignGame} className="iconDanger">
                <IconPass />
              </IconButton>
              <IconButton label="Exit to Home" onClick={handleExit} className="iconDanger">
                <IconMenu />
              </IconButton>
            </div>
          </div>
        </aside>
        <section className="centerStage">
          <div className="matchStrip">
            <div className="playerCard">
              <div className="avatarCircle">You</div>
              <div>
                <div className="playerName">Player</div>
                <div className="playerScore">{game.scores.player}</div>
              </div>
            </div>
            <div className="matchTitle">
              Match
              <span className="matchSub">{isPlayerTurn ? "Your turn" : "AI thinking"}</span>
            </div>
            <div className="playerCard">
              <div className="avatarCircle ai">AI</div>
              <div>
                <div className="playerName">Opponent</div>
                <div className="playerScore">{game.scores.ai}</div>
              </div>
            </div>
          </div>

          <div className="boardPanel">
            <div className="boardHeader">
              <div className="boardHint">
                Tap a tile, then a square to place. Submit flips hidden modifiers.
              </div>
              <div className="chipRow">
                <span className="chip chipPassive">Center = START</span>
                <button
                  type="button"
                  className={"chip " + (showHiddenHints ? "chipActive" : "")}
                  onClick={toggleHiddenHints}
                  disabled={!canInteract}
                >
                  {showHiddenHints ? "Hide hidden tiles" : "Highlight hidden tiles"}
                </button>
              </div>
            </div>

            <div className="boardViewport">
              <div className="boardFrame">
                <Board
                  board={game.board}
                  tilesById={game.tilesById}
                  placedThisTurn={placedThisTurn}
                  lastRevealAnim={game.lastRevealAnim}
                  lastPlayedIds={game.lastPlayedIds}
                  onTapSquare={onTapSquare}
                  showHiddenHints={showHiddenHints}
                  canDrag={canInteract}
                  onDropTile={onBoardDrop}
                  onTilePointerDown={(tileId, event) => beginTouchDrag(tileId, "board", event)}
                />
              </div>
            </div>
          </div>

          <div className="rackBar">
            <div className="rackSide">
              <button
                className="iconButton compact"
                type="button"
                onClick={handleExit}
                aria-label="Home"
              >
                <span className="iconGlyph"><IconMenu /></span>
                <span className="iconLabel">Home</span>
              </button>
              <div className="bagCounter">
                <div className="bagValue">{game.bag.length}</div>
                <div className="bagLabel">left</div>
              </div>
            </div>

            <div className="rackCenter">
              <Rack
                rack={game.rack}
                selectedTileId={selectedTileId}
                onSelect={onSelectRackTile}
                draggable={canInteract}
                onTileDragStart={onRackDragStart}
                onTilePointerDown={(tileId, event) => beginTouchDrag(tileId, "rack", event)}
                onTileSwapDrop={swapRackTiles}
                onDropTile={onRackDrop}
              />
            </div>

            <div className="rackActions">
              <button
                className="iconButton compact"
                type="button"
                onClick={shuffleRack}
                aria-label="Shuffle rack"
                disabled={!canInteract}
              >
                <span className="iconGlyph"><IconShuffle /></span>
                <span className="iconLabel">Shuffle</span>
              </button>
              <button
                className="iconButton compact"
                type="button"
                onClick={swapRack}
                aria-label="Swap tiles"
                disabled={!canSwap}
              >
                <span className="iconGlyph"><IconSwap /></span>
                <span className="iconLabel">Swap</span>
              </button>
              <button
                className="iconButton compact"
                type="button"
                onClick={passTurn}
                aria-label="Pass"
                disabled={!canInteract}
              >
                <span className="iconGlyph"><IconPass /></span>
                <span className="iconLabel">Pass</span>
              </button>
              <button
                className="iconButton compact"
                type="button"
                onClick={undo}
                disabled={!canInteract || placedThisTurn.length === 0}
                aria-label="Undo"
              >
                <span className="iconGlyph"><IconUndo /></span>
                <span className="iconLabel">Undo</span>
              </button>
              <button
                className="iconButton play"
                type="button"
                onClick={openSubmitModal}
                disabled={!canPlay}
                aria-label="Play"
              >
                <span className="iconGlyph"><IconPlay /></span>
                <span className="iconLabel">Play</span>
              </button>
            </div>
          </div>

          <div className="tileStatus">
            <div>{selectedTile ? `Selected ${selectedTile.letter} (${selectedTile.value})` : "Select a tile to place"}</div>
            <div>Placed this turn: {placedThisTurn.length} | Tiles played: {tilesPlaced}</div>
          </div>
        </section>
      </div>
      <div className="mobileShell">
        <div className="mobileTopBar">
          <button className="mobileIconButton" type="button" onClick={handleExit} aria-label="Home">
            <span className="iconGlyph"><IconBack /></span>
          </button>

          <div className="mobilePlayerGroup">
            <div className="mobilePlayerBlock">
              <div className="mobileAvatar">You</div>
              <div className="mobilePlayerMeta">
                <div className="mobilePlayerName">You</div>
                <div className="mobilePlayerScore">{game.scores.player}</div>
              </div>
            </div>
            <div className="mobileTurnInfo">
              <div className="mobileTurnLabel">{isPlayerTurn ? "Your turn" : "AI thinking"}</div>
              <div className="mobileTurnCount">Turn {turn}</div>
            </div>
            <div className="mobilePlayerBlock ai">
              <div className="mobileAvatar ai">AI</div>
              <div className="mobilePlayerMeta">
                <div className="mobilePlayerName">AI</div>
                <div className="mobilePlayerScore">{game.scores.ai}</div>
              </div>
            </div>
          </div>

          <button
            className="mobileHistoryButton"
            type="button"
            onClick={openHistory}
            aria-label="Moves"
          >
            <span className="iconGlyph"><IconHistory /></span>
            <span>Moves</span>
          </button>
        </div>

        <div className="mobileBoardArea">
          <div className={`mobileBoardFrame ${placedThisTurn.length > 0 ? "boardPlacing" : ""}`}>
            <Board
              board={game.board}
              tilesById={game.tilesById}
              placedThisTurn={placedThisTurn}
              lastRevealAnim={game.lastRevealAnim}
              lastPlayedIds={game.lastPlayedIds}
              onTapSquare={onTapSquare}
              showHiddenHints={showHiddenHints}
              canDrag={canInteract}
              onDropTile={onBoardDrop}
              onTilePointerDown={(tileId, event) => beginTouchDrag(tileId, "board", event)}
            />
          </div>
        </div>

        <div className="lettersLeft">{game.bag.length} letters left</div>

        <div className="mobileRack">
          <Rack
            rack={game.rack}
            selectedTileId={selectedTileId}
            onSelect={onSelectRackTile}
            draggable={canInteract}
            onTileDragStart={onRackDragStart}
            onTilePointerDown={(tileId, event) => beginTouchDrag(tileId, "rack", event)}
            onTileSwapDrop={swapRackTiles}
            onDropTile={onRackDrop}
          />
        </div>

        <div className="mobileActionBar">
          <button className="actionButton" type="button" onClick={openMoreMenu} aria-label="More">
            <span className="iconGlyph"><IconMenu /></span>
            <span className="iconLabel">More</span>
          </button>
          <button
            className="actionButton"
            type="button"
            onClick={undo}
            disabled={!canInteract || placedThisTurn.length === 0}
            aria-label="Undo"
          >
            <span className="iconGlyph"><IconUndo /></span>
            <span className="iconLabel">Undo</span>
          </button>
          <button className="actionButton" type="button" onClick={passTurn} disabled={!canInteract} aria-label="Pass">
            <span className="iconGlyph"><IconPass /></span>
            <span className="iconLabel">Pass</span>
          </button>
          <button className="actionButton primary" type="button" onClick={openSubmitModal} disabled={!canPlay} aria-label="Play">
            <span className="iconGlyph"><IconPlay /></span>
            <span className="iconLabel">Play</span>
          </button>
          <button
            className="actionButton"
            type="button"
            onClick={recallTurn}
            disabled={!canInteract || placedThisTurn.length === 0}
            aria-label="Recall"
          >
            <span className="iconGlyph"><IconRecall /></span>
            <span className="iconLabel">Recall</span>
          </button>
          <button className="actionButton" type="button" onClick={swapRack} disabled={!canSwap} aria-label="Swap">
            <span className="iconGlyph"><IconSwap /></span>
            <span className="iconLabel">Swap</span>
          </button>
          <button className="actionButton" type="button" onClick={shuffleRack} disabled={!canInteract} aria-label="Shuffle">
            <span className="iconGlyph"><IconShuffle /></span>
            <span className="iconLabel">Shuffle</span>
          </button>
        </div>
      </div>

      {touchDrag && dragTile && (
        <div
          className="tile dragGhost"
          style={{
            width: touchDrag.width,
            height: touchDrag.height,
            transform: `translate3d(${touchDrag.x}px, ${touchDrag.y}px, 0)`,
            backgroundImage: `url(${tileBase})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {!dragTile.isBlank && <div className="tileLetter">{dragTile.letter}</div>}
          {dragTile.value > 0 && <div className="tileValue">{dragTile.value}</div>}
        </div>
      )}

      {blankPicker && (
        <div className="blankOverlay" onClick={() => setBlankPicker(null)}>
          <div className="blankCard" onClick={(event) => event.stopPropagation()}>
            <div className="blankTitle">Choose a letter</div>
            <div className="blankGrid">
              {BLANK_LETTERS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className="blankButton"
                  onClick={() => confirmBlankLetter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <button type="button" className="blankCancel" onClick={closeBlankPicker}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="gameOverOverlay">
          <div className="gameOverCard">
            <div className="gameOverTitle">
              {gameOver.winner === "Tie"
                ? "Tie Game"
                : gameOver.winner === "You"
                ? "You Win!"
                : "AI Wins"}
            </div>
            <div className="gameOverReason">{gameOver.reason}</div>
            <div className="gameOverScoreLine">
              <span>You {gameOver.scores.player}</span>
              <span>AI {gameOver.scores.ai}</span>
            </div>
            <div className="gameOverGrid">
              <div className="gameOverBlock">
                <div className="gameOverBlockTitle">You</div>
                <div className="gameOverStat">Moves {gameOver.stats.playerMoves}</div>
                <div className="gameOverStat">Words {gameOver.stats.playerWords}</div>
                <div className="gameOverStat">Tiles {gameOver.stats.playerTiles}</div>
                <div className="gameOverStat">Points {gameOver.stats.playerPoints}</div>
              </div>
              <div className="gameOverBlock">
                <div className="gameOverBlockTitle">AI</div>
                <div className="gameOverStat">Moves {gameOver.stats.aiMoves}</div>
                <div className="gameOverStat">Words {gameOver.stats.aiWords}</div>
                <div className="gameOverStat">Tiles {gameOver.stats.aiTiles}</div>
                <div className="gameOverStat">Points {gameOver.stats.aiPoints}</div>
              </div>
            </div>
            <div className="gameOverBest">Best move: {gameOver.stats.bestMove}</div>
            <div className="gameOverButtons">
              <button type="button" className="confirmBtn primary" onClick={newMatch}>
                Play Again
              </button>
              <button type="button" className="confirmBtn" onClick={handleExit}>
                Home
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="historyOverlay" onClick={() => setShowHistory(false)}>
          <div className="historyCard" onClick={(event) => event.stopPropagation()}>
            <div className="historyHeader">
              <div className="historyTitle">Moves</div>
              <button
                type="button"
                className="historyClose"
                onClick={closeHistory}
                aria-label="Close moves"
              >
                Close
              </button>
            </div>
            <div className="historyList">
              {moveHistory.length === 0 ? (
                <div className="historyEmpty">No moves yet.</div>
              ) : (
                moveHistory.map((entry) => (
                  <div key={entry.id} className="historyItem">
                    <div className="historyMeta">
                      <span className={`historyPlayer ${entry.player === "AI" ? "ai" : ""}`}>
                        {entry.player}
                      </span>
                      <span className="historyPoints">+{entry.points}</span>
                    </div>
                    <div className="historyWords">
                      {entry.words.length > 0
                        ? entry.words.join(" / ")
                        : entry.action === "swap"
                        ? "Swap"
                        : "Pass"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showMoreMenu && (
        <div className="moreOverlay" onClick={() => setShowMoreMenu(false)} role="presentation">
          <div className="moreCard" onClick={(event) => event.stopPropagation()}>
            <div className="moreHeader">
              <div>More</div>
              <button className="iconButton tiny" type="button" onClick={closeMoreMenu} aria-label="Close">
                <span className="iconGlyph">X</span>
              </button>
            </div>
            <div className="moreSection">
              <button className="moreActionButton" type="button" onClick={handleExit}>
                Home
              </button>
              <button className="moreActionButton danger" type="button" onClick={resignGame}>
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {playModal && (
        <div className="confirmOverlay" onClick={() => setPlayModal(null)} role="presentation">
          <div className="confirmCard" onClick={(event) => event.stopPropagation()}>
            {playModal.type === "confirm" ? (
              <>
                <div className="confirmTitle">Play this word?</div>
                <div className="confirmTiles">
                  {playModal.words.map((w) => (
                    <WordTiles key={w.text} word={w.text} />
                  ))}
                </div>
                <div className="confirmMeta">Estimated points: {playModal.points}</div>
                <div className="confirmButtons">
                  <button
                    type="button"
                    className="confirmBtn ghost"
                    onClick={closePlayModal}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="confirmBtn primary"
                    onClick={() => commitTurn(playModal.words, playModal.points)}
                  >
                    Yes
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="confirmTitle">Word not valid</div>
                {playModal.words.length > 0 && (
                  <div className="confirmTiles">
                    {playModal.words.map((w) => (
                      <WordTiles key={w.text} word={w.text} />
                    ))}
                  </div>
                )}
                <div className="confirmReason">{playModal.reason}</div>
                <div className="confirmButtons">
                  <button
                    type="button"
                    className="confirmBtn primary"
                    onClick={closePlayModal}
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
