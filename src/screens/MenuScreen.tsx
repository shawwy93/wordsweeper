import { useRef, useState } from "react";
import type { Difficulty } from "../game/types";
import { computeLevelProgress } from "../progression/leveling";
import { loadProgression } from "../progression/storage";
import buttonAudioSrc from "../assets/audio/buttonAudio.mp3";
import playAudioSrc from "../assets/audio/playAudio.mp3";

export default function MenuScreen(props: {
  onPlay: () => void;
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
  const progression = loadProgression();
  const levelInfo = computeLevelProgress(progression.totalXP);
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
    setShowDifficulty(true);
  }

  function handleResume() {
    playButtonSound();
    props.onResume();
  }

  function handlePick(d: Difficulty) {
    playButtonSound();
    props.setDifficulty(d);
    setShowDifficulty(false);
    props.onPlay();
  }

  function handleClosePicker() {
    playButtonSound();
    setShowDifficulty(false);
  }

  function handleStats() {
    playButtonSound();
    props.onStats();
  }

  function handleSettings() {
    playButtonSound();
    props.onSettings();
  }

  return (
    <div className="screen screenMenu">
      <div className="menuLayout">
        <div className="menuHeaderSpacer" aria-hidden="true" />
        <div className="menuStack">
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
                className={"difficultyOption" + (props.difficulty === "normal" ? " selected" : "")}
                onClick={() => handlePick("normal")}
              >
                Normal
              </button>
              <button
                type="button"
                className={"difficultyOption" + (props.difficulty === "hard" ? " selected" : "")}
                onClick={() => handlePick("hard")}
              >
                Hard
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
