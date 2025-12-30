export type CrossStats = {
  gamesStarted: number;
  playerMoves: number;
  playerWords: number;
  tilesPlaced: number;
  pointsScored: number;
  highestMove: number;
};

const DEFAULT_STATS: CrossStats = {
  gamesStarted: 0,
  playerMoves: 0,
  playerWords: 0,
  tilesPlaced: 0,
  pointsScored: 0,
  highestMove: 0,
};

const STORAGE_KEY = "hh_cross_stats";

function normalizeStats(raw: Partial<CrossStats>): CrossStats {
  return {
    gamesStarted: Number(raw.gamesStarted) || 0,
    playerMoves: Number(raw.playerMoves) || 0,
    playerWords: Number(raw.playerWords) || 0,
    tilesPlaced: Number(raw.tilesPlaced) || 0,
    pointsScored: Number(raw.pointsScored) || 0,
    highestMove: Number(raw.highestMove) || 0,
  };
}

export function loadCrossStats(): CrossStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<CrossStats>;
    return normalizeStats(parsed);
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveCrossStats(stats: CrossStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

export function recordCrossGameStart() {
  const stats = loadCrossStats();
  stats.gamesStarted += 1;
  saveCrossStats(stats);
}

export function recordCrossMoveStats(params: { player: "You" | "AI"; words: number; points: number; tiles: number }) {
  if (params.player !== "You") return;
  const stats = loadCrossStats();
  stats.playerMoves += 1;
  stats.playerWords += params.words;
  stats.tilesPlaced += params.tiles;
  stats.pointsScored += params.points;
  if (params.points > stats.highestMove) stats.highestMove = params.points;
  saveCrossStats(stats);
}

export function resetCrossStats() {
  saveCrossStats({ ...DEFAULT_STATS });
}
