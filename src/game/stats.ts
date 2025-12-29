export type Stats = {
  gamesStarted: number;
  wins: number;
  losses: number;
  playerMoves: number;
  aiMoves: number;
  playerWords: number;
  aiWords: number;
  tilesPlaced: number;
  pointsScored: number;
  highestMove: number;
};

const DEFAULT_STATS: Stats = {
  gamesStarted: 0,
  wins: 0,
  losses: 0,
  playerMoves: 0,
  aiMoves: 0,
  playerWords: 0,
  aiWords: 0,
  tilesPlaced: 0,
  pointsScored: 0,
  highestMove: 0,
};

function normalizeStats(raw: Partial<Stats> & { games?: number }): Stats {
  return {
    gamesStarted: Number(raw.gamesStarted ?? raw.games) || 0,
    wins: Number(raw.wins) || 0,
    losses: Number(raw.losses) || 0,
    playerMoves: Number(raw.playerMoves) || 0,
    aiMoves: Number(raw.aiMoves) || 0,
    playerWords: Number(raw.playerWords) || 0,
    aiWords: Number(raw.aiWords) || 0,
    tilesPlaced: Number(raw.tilesPlaced) || 0,
    pointsScored: Number(raw.pointsScored) || 0,
    highestMove: Number(raw.highestMove) || 0,
  };
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem("hh_stats");
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<Stats> & { games?: number };
    return normalizeStats(parsed);
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem("hh_stats", JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

export function recordGameStart() {
  const stats = loadStats();
  stats.gamesStarted += 1;
  saveStats(stats);
}

export function recordMoveStats(params: {
  player: "You" | "AI";
  words: number;
  points: number;
  tiles: number;
}) {
  const stats = loadStats();
  if (params.player === "You") {
    stats.playerMoves += 1;
    stats.playerWords += params.words;
  } else {
    stats.aiMoves += 1;
    stats.aiWords += params.words;
  }
  stats.tilesPlaced += params.tiles;
  stats.pointsScored += params.points;
  if (params.points > stats.highestMove) stats.highestMove = params.points;
  saveStats(stats);
}

export function recordGameResult(result: "win" | "loss") {
  const stats = loadStats();
  if (result === "win") stats.wins += 1;
  else stats.losses += 1;
  saveStats(stats);
}
