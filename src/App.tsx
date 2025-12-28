import { useMemo, useState } from "react";
import MenuScreen from "./screens/MenuScreen";
import GameScreen from "./screens/GameScreen";
import HowToPlayScreen from "./screens/HowToPlayScreen";
import SettingsScreen from "./screens/SettingsScreen";
import StatsScreen from "./screens/StatsScreen";
import { Difficulty } from "./game/types";

type Screen = "menu" | "game" | "how" | "settings" | "stats";

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

  const settings = useMemo(
    () => ({
      difficulty,
      setDifficulty: (d: Difficulty) => {
        setDifficulty(d);
        localStorage.setItem("hh_difficulty", d);
      },
    }),
    [difficulty]
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
        />
      )}

      {screen === "game" && (
        <GameScreen
          difficulty={settings.difficulty}
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
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "stats" && <StatsScreen onBack={() => setScreen("menu")} />}
    </div>
  );
}
