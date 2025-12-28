import { useMemo, useState } from "react";
import MenuScreen from "./screens/MenuScreen";
import GameScreen from "./screens/GameScreen";
import HowToPlayScreen from "./screens/HowToPlayScreen";
import SettingsScreen from "./screens/SettingsScreen";
import StatsScreen from "./screens/StatsScreen";
import { Difficulty } from "./game/types";

type Screen = "menu" | "game" | "how" | "settings" | "stats";
type AudioSettings = { ui: boolean; game: boolean };

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const seenHow = localStorage.getItem("hh_seenHow") === "1";
    return seenHow ? "menu" : "how";
  });
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
    }),
    [difficulty, audioSettings]
  );

  return (
    <div className="app">
      {screen === "menu" && (
        <MenuScreen
          onPlay={() => setScreen("game")}
          onHow={() => setScreen("how")}
          onSettings={() => setScreen("settings")}
          onStats={() => setScreen("stats")}
          difficulty={settings.difficulty}
          setDifficulty={settings.setDifficulty}
          audio={settings.audio}
        />
      )}

      {screen === "game" && (
        <GameScreen
          difficulty={settings.difficulty}
          audio={settings.audio}
          onExit={() => setScreen("menu")}
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
          difficulty={settings.difficulty}
          setDifficulty={settings.setDifficulty}
          audio={settings.audio}
          setAudio={settings.setAudio}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "stats" && <StatsScreen onBack={() => setScreen("menu")} />}
    </div>
  );
}
