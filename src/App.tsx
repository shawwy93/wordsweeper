import { useEffect, useMemo, useRef, useState } from "react";
import MenuScreen from "./screens/MenuScreen";
import GameScreen from "./screens/GameScreen";
import HowToPlayScreen from "./screens/HowToPlayScreen";
import SettingsScreen from "./screens/SettingsScreen";
import StatsScreen from "./screens/StatsScreen";
import { Difficulty } from "./game/types";
import backgroundAudioSrc from "./assets/audio/backgroundAudio.mp3";

type Screen = "menu" | "game" | "how" | "settings" | "stats";
type AudioSettings = { ui: boolean; game: boolean };
type MusicSettings = { muted: boolean; volume: number };

export default function App() {
  const initialResume = (() => {
    const saved = localStorage.getItem("hh_saved_game");
    const last = localStorage.getItem("hh_active_screen");
    return Boolean(saved) && last === "game";
  })();
  const [screen, setScreen] = useState<Screen>(() => {
    const seenHow = localStorage.getItem("hh_seenHow") === "1";
    if (initialResume) return "game";
    return seenHow ? "menu" : "how";
  });
  const [settingsReturn, setSettingsReturn] = useState<Screen>("menu");
  const [resumeGame, setResumeGame] = useState(initialResume);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const raw = localStorage.getItem("hh_difficulty");
    if (raw === "easy" || raw === "normal" || raw === "hard") return raw;
    return "normal";
  });
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => {
    const ui = localStorage.getItem("hh_audio_ui");
    const game = localStorage.getItem("hh_audio_game");
    return {
      ui: ui !== "0",
      game: game !== "0",
    };
  });
  const [musicSettings, setMusicSettings] = useState<MusicSettings>(() => {
    const rawMuted = localStorage.getItem("hh_music_muted");
    const rawVolume = localStorage.getItem("hh_music_volume");
    const volume = rawVolume ? Number(rawVolume) : 0.35;
    return {
      muted: rawMuted === "1",
      volume: Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : 0.35,
    };
  });

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicStartedRef = useRef(false);

  if (!musicRef.current) {
    const audio = new Audio(backgroundAudioSrc);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = musicSettings.muted ? 0 : musicSettings.volume;
    audio.muted = musicSettings.muted;
    musicRef.current = audio;
  }


  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = musicSettings.muted ? 0 : musicSettings.volume;
    audio.muted = musicSettings.muted;
  }, [musicSettings]);

  useEffect(() => {
    localStorage.setItem("hh_active_screen", screen);
  }, [screen]);

  useEffect(() => {
    function tryStart() {
      if (musicStartedRef.current) return;
      const audio = musicRef.current;
      if (!audio) return;
      const result = audio.play();
      if (result && typeof result.then === "function") {
        result
          .then(() => {
            musicStartedRef.current = true;
            window.removeEventListener("pointerdown", tryStart);
            window.removeEventListener("keydown", tryStart);
          })
          .catch(() => {
            // allow next interaction to retry
          });
      } else {
        musicStartedRef.current = true;
        window.removeEventListener("pointerdown", tryStart);
        window.removeEventListener("keydown", tryStart);
      }
    }

    window.addEventListener("pointerdown", tryStart);
    window.addEventListener("keydown", tryStart);

    return () => {
      window.removeEventListener("pointerdown", tryStart);
      window.removeEventListener("keydown", tryStart);
    };
  }, []);
  function openSettings(from: Screen) {
    setSettingsReturn(from);
    setScreen("settings");
  }

  function handleSettingsBack() {
    setScreen(settingsReturn);
    if (settingsReturn === "game") {
      setResumeGame(true);
    }
  }

  function startNewGame() {
    setResumeGame(false);
    setScreen("game");
  }

  function exitToMenu() {
    setResumeGame(false);
    setScreen("menu");
  }

  const settings = useMemo(
    () => ({
      difficulty,
      setDifficulty: (d: Difficulty) => {
        setDifficulty(d);
        localStorage.setItem("hh_difficulty", d);
      },
      audio: audioSettings,
      setAudio: (next: AudioSettings) => {
        setAudioSettings(next);
        localStorage.setItem("hh_audio_ui", next.ui ? "1" : "0");
        localStorage.setItem("hh_audio_game", next.game ? "1" : "0");
      },
      music: musicSettings,
      setMusic: (next: MusicSettings) => {
        setMusicSettings(next);
        localStorage.setItem("hh_music_muted", next.muted ? "1" : "0");
        localStorage.setItem("hh_music_volume", String(next.volume));
      },
    }),
    [difficulty, audioSettings, musicSettings]
  );

  return (
    <div className="app">
      {screen === "menu" && (
        <MenuScreen
          onPlay={startNewGame}
          onHow={() => setScreen("how")}
          onSettings={() => openSettings("menu")}
          onStats={() => setScreen("stats")}
          audio={settings.audio}
        />
      )}

      {screen === "game" && (
        <GameScreen
          difficulty={settings.difficulty}
          audio={settings.audio}
          onExit={exitToMenu}
          onSettings={() => openSettings("game")}
          resume={resumeGame}
        />
      )}

      {screen === "how" && (
        <HowToPlayScreen
          onBack={() => {
            localStorage.setItem("hh_seenHow", "1");
            setScreen("menu");
          }}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          audio={settings.audio}
          setAudio={settings.setAudio}
          music={settings.music}
          setMusic={settings.setMusic}
          onBack={handleSettingsBack}
        />
      )}

      {screen === "stats" && <StatsScreen onBack={() => setScreen("menu")} />}
    </div>
  );
}
