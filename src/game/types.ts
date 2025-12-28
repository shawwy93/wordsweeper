export type Difficulty = "easy" | "normal" | "hard";

export type ModifierType =
  | "DL"
  | "TL"
  | "DW"
  | "TW"
  | "EVIL_LETTER"
  | "EVIL_WORD"
  | null;

export type Tile = {
  id: string;
  letter: string;
  value: number;
  isBlank?: boolean;
};

export type BoardCell = {
  x: number;
  y: number;
  isCenter: boolean;

  tileId?: string;
  letterOverride?: string;

  modifier: ModifierType;
  revealed: boolean;

  // Tracks whether a modifier has already triggered once this match:
  triggered: boolean;

  // For reveal animation timing:
  revealedAt?: number;
};

export type PlacedTile = {
  tileId: string;
  x: number;
  y: number;
  letterOverride?: string;
};

export type GameState = {
  difficulty: Difficulty;

  board: BoardCell[][];
  bag: Tile[];
  rack: Tile[];
  aiRack: Tile[];

  tilesById: Record<string, Tile>;

  placedThisTurn: PlacedTile[];
  lastRevealAnim: number;
  lastPlayedIds: string[];

  scores: { player: number; ai: number };
};
