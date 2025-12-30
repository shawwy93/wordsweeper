export type CrossScoreEntry = {
  id: string;
  score: number;
  words: number;
  tiles: number;
  createdAt: string;
};

const STORAGE_KEY = "hh_cross_scores";
const MAX_SCORES = 10;

function normalizeEntry(entry: Partial<CrossScoreEntry>): CrossScoreEntry | null {
  const score = Number(entry.score);
  if (!Number.isFinite(score)) return null;
  return {
    id: typeof entry.id === "string" ? entry.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    score: Math.max(0, Math.floor(score)),
    words: Number.isFinite(Number(entry.words)) ? Math.max(0, Math.floor(Number(entry.words))) : 0,
    tiles: Number.isFinite(Number(entry.tiles)) ? Math.max(0, Math.floor(Number(entry.tiles))) : 0,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
  };
}

export function loadCrossScores(): CrossScoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CrossScoreEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is CrossScoreEntry => Boolean(entry))
      .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
      .slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

function saveCrossScores(scores: CrossScoreEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // ignore storage errors
  }
}

export function recordCrossScore(entry: Omit<CrossScoreEntry, "id" | "createdAt">) {
  const scores = loadCrossScores();
  const next: CrossScoreEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    score: Math.max(0, Math.floor(entry.score)),
    words: Math.max(0, Math.floor(entry.words)),
    tiles: Math.max(0, Math.floor(entry.tiles)),
    createdAt: new Date().toISOString(),
  };
  const merged = [next, ...scores]
    .sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
    .slice(0, MAX_SCORES);
  saveCrossScores(merged);
  return merged;
}
