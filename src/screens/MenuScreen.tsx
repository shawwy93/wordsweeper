import { useRef, useState } from "react";
import type { Difficulty } from "../game/types";
import { computeLevelProgress } from "../progression/leveling";
import { loadProgression } from "../progression/storage";
import buttonAudioSrc from "../assets/audio/buttonAudio.mp3";
import playAudioSrc from "../assets/audio/playAudio.mp3";
import logoSrc from "../assets/logo.png";

export default function MenuScreen(props: {
  onPlay: () => void;
  onCross: () => void;
  onWordle: () => void;
  onResume: () => void;
  onHow: () => void;
  onSettings: () => void;
  onStats: () => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  audio: { ui: boolean; game: boolean };
  hasSavedGame: boolean;
}) {
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [pendingMode, setPendingMode] = useState<"standard" | "cross" | null>(null);
  const progression = loadProgression();
  const levelInfo = computeLevelProgress(progression.totalXP);
  const normalLocked = levelInfo.level < 5;
  const hardLocked = levelInfo.level < 10;
  const audioRef = useRef<{
    play: HTMLAudioElement;
    button: HTMLAudioElement;
  } | null>(null);

  if (!audioRef.current) {
    audioRef.current = {
      play: new Audio(playAudioSrc),
      button: new Audio(buttonAudioSrc),
    };
    Object.values(audioRef.current).forEach((audio) => {
      audio.preload = "auto";
    });
  }

  function playSound(audio?: HTMLAudioElement) {
    if (!audio || !props.audio.ui) return;
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

  function playPlaySound() {
    playSound(audioRef.current?.play);
  }

  function playButtonSound() {
    playSound(audioRef.current?.button);
  }

  function handlePlayClick() {
    playPlaySound();
    setShowModePicker(true);
  }

  function handleResume() {
    playButtonSound();
    props.onResume();
  }

  function handlePick(d: Difficulty) {
    if ((d === "normal" && normalLocked) || (d === "hard" && hardLocked)) {
      return;
    }
    playButtonSound();
    props.setDifficulty(d);
    setShowDifficulty(false);
    const mode = pendingMode ?? "standard";
    setPendingMode(null);
    if (mode === "cross") {
      startCross();
      return;
    }
    props.onPlay();
  }

  function handleClosePicker() {
    playButtonSound();
    setShowDifficulty(false);
    setPendingMode(null);
  }

  function handleStats() {
    playButtonSound();
    props.onStats();
  }

  function handleSettings() {
    playButtonSound();
    props.onSettings();
  }

  function handleCloseModePicker() {
    playButtonSound();
    setShowModePicker(false);
    setPendingMode(null);
  }

  function startCross() {
    props.onCross();
  }

  function startWordle() {
    props.onWordle();
  }

  function handleModePick(mode: "standard" | "cross" | "wordle") {
    playButtonSound();
    setShowModePicker(false);
    if (mode === "wordle") {
      startWordle();
      return;
    }
    setPendingMode(mode);
    setShowDifficulty(true);
  }

  return (
    <div className="screen screenMenu">
      <div className="menuLayout">
        <div className="menuHeaderSpacer" aria-hidden="true" />
        <div className="menuStack">
          <img className="menuLogo" src={logoSrc} alt="Word Sweeper" />
          <div className="menuLevel">
            <div className="menuLevelRow">
              <span>Level {levelInfo.level}</span>
              <span>{levelInfo.progress}/{levelInfo.target} XP</span>
            </div>
            <div className="menuLevelBar">
              <div className="menuLevelFill" style={{ width: `${Math.round(levelInfo.percent * 100)}%` }} />
            </div>
          </div>
          <button className="menuAction primary" type="button" onClick={handlePlayClick}>
            Play
          </button>
          {props.hasSavedGame && (
            <button className="menuAction" type="button" onClick={handleResume}>
              Resume
            </button>
          )}
          <div className="menuSecondary">
            <button className="menuSecondaryAction" type="button" onClick={handleStats}>
              Stats
            </button>
            <button className="menuSecondaryAction" type="button" onClick={handleSettings}>
              Settings
            </button>
          </div>
          <a className="menuPrivacy" href="/privacy.html">
            Privacy
          </a>
        </div>
      </div>

      {showModePicker && (
        <div className="difficultyOverlay" onClick={handleCloseModePicker}>
          <div className="difficultyCard" onClick={(event) => event.stopPropagation()}>
            <div className="difficultyTitle">Choose mode</div>
            <div className="difficultyButtons">
              <button type="button" className="difficultyOption" onClick={() => handleModePick("standard")}>
                Word Sweeper
              </button>
              <button type="button" className="difficultyOption" onClick={() => handleModePick("cross")}>
                Cross Sweeper
              </button>
              <button type="button" className="difficultyOption" onClick={() => handleModePick("wordle")}>
                Word Sweeple
              </button>
            </div>
            <button type="button" className="difficultyCancel" onClick={handleCloseModePicker}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showDifficulty && (
        <div className="difficultyOverlay" onClick={handleClosePicker}>
          <div className="difficultyCard" onClick={(event) => event.stopPropagation()}>
            <div className="difficultyTitle">Choose difficulty</div>
            <div className="difficultyButtons">
              <button
                type="button"
                className={"difficultyOption" + (props.difficulty === "easy" ? " selected" : "")}
                onClick={() => handlePick("easy")}
              >
                Easy
              </button>
              <button
                type="button"
                className={"difficultyOption" + (props.difficulty === "normal" ? " selected" : "") + (normalLocked ? " locked" : "")}
                onClick={() => handlePick("normal")}
                disabled={normalLocked}
              >
                Normal
                {normalLocked && <span className="difficultyLock">Unlocks at level 5</span>}
              </button>
              <button
                type="button"
                className={"difficultyOption" + (props.difficulty === "hard" ? " selected" : "") + (hardLocked ? " locked" : "")}
                onClick={() => handlePick("hard")}
                disabled={hardLocked}
              >
                Hard
                {hardLocked && <span className="difficultyLock">Unlocks at level 10</span>}
              </button>
            </div>
            <button type="button" className="difficultyCancel" onClick={handleClosePicker}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
