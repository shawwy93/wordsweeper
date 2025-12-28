import { useRef } from "react";
import type { Difficulty } from "../game/types";
import buttonAudioSrc from "../assets/audio/buttonAudio.mp3";
import playAudioSrc from "../assets/audio/playAudio.mp3";

export default function MenuScreen(props: {
  onPlay: () => void;
  onHow: () => void;
  onSettings: () => void;
  onStats: () => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
}) {
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

  function playPlaySound() {
    playSound(audioRef.current?.play);
  }

  function playButtonSound() {
    playSound(audioRef.current?.button);
  }

  function handlePlay() {
    playPlaySound();
    props.onPlay();
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
          <button className="menuAction primary" type="button" onClick={handlePlay}>
            Play
          </button>
          <div className="menuSecondary">
            <button className="menuSecondaryAction" type="button" onClick={handleStats}>
              Stats
            </button>
            <button className="menuSecondaryAction" type="button" onClick={handleSettings}>
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
