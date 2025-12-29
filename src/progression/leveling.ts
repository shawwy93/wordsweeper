export type XpGainInput = {
  win: boolean;
  wordsPlayed: number;
  tilesPlaced: number;
  modifiersRevealed: number;
};

export type LevelProgress = {
  level: number;
  progress: number;
  target: number;
  percent: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function xpToNext(level: number) {
  return 100 + 25 * level + 10 * level * level;
}

export function computeXpGain(input: XpGainInput) {
  const words = clamp(Math.floor(input.wordsPlayed), 0, 10);
  const tiles = clamp(Math.floor(input.tilesPlaced), 0, 10);
  const modifiers = clamp(Math.floor(input.modifiersRevealed), 0, 6);
  const winBonus = input.win ? 20 : 0;

  return 40 + winBonus + words + tiles + 2 * modifiers;
}

export function computeLevelProgress(totalXP: number): LevelProgress {
  const safeXP = Math.max(0, Math.floor(totalXP));
  let level = 1;
  let remaining = safeXP;
  let target = xpToNext(level);

  while (remaining >= target) {
    remaining -= target;
    level += 1;
    target = xpToNext(level);
  }

  const percent = target > 0 ? clamp(remaining / target, 0, 1) : 0;

  return {
    level,
    progress: remaining,
    target,
    percent,
  };
}
