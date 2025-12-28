import type { ChangeEvent } from "react";
import Button from "../components/Button";
import TopBar from "../components/TopBar";
import { Difficulty } from "../game/types";

export default function SettingsScreen(props: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  audio: { ui: boolean; game: boolean };
  setAudio: (next: { ui: boolean; game: boolean }) => void;
  music: { muted: boolean; volume: number };
  setMusic: (next: { muted: boolean; volume: number }) => void;
  onBack: () => void;
}) {
  const set = (d: Difficulty) => () => props.setDifficulty(d);
  const toggleUi = () => props.setAudio({ ...props.audio, ui: !props.audio.ui });
  const toggleGame = () => props.setAudio({ ...props.audio, game: !props.audio.game });
  const toggleMusicMuted = () => props.setMusic({ ...props.music, muted: !props.music.muted });
  const handleMusicVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value) / 100;
    props.setMusic({ ...props.music, volume: next });
  };

  return (
    <div className="screen">
      <div className="card">
        <TopBar title="Settings" right={<Button onClick={props.onBack}>Back</Button>} />
        <div style={{ padding: 14 }}>
          <div className="sectionTitle">Rules</div>
          <ul className="settingsRules">
            <li>11x11 board. First move must cover the center start square.</li>
            <li>Tiles placed in one line and must connect to existing tiles.</li>
            <li>All words formed must be valid.</li>
            <li>Hidden modifiers reveal on submit and stay visible.</li>
            <li>Game ends after 3 passes in a row, 3 scoreless turns, or when the bag and a rack are empty.</li>
          </ul>

          <div style={{ height: 12 }} />
          <div className="sectionTitle">Difficulty</div>
          <div className="small" style={{ marginBottom: 10 }}>
            Difficulty changes how smart the AI chooses moves. It never sees hidden modifiers early.
          </div>

          <div className="col">
            <Button
              variant={props.difficulty === "easy" ? "primary" : "default"}
              onClick={set("easy")}
            >
              Easy
            </Button>
            <Button
              variant={props.difficulty === "normal" ? "primary" : "default"}
              onClick={set("normal")}
            >
              Normal
            </Button>
            <Button
              variant={props.difficulty === "hard" ? "primary" : "default"}
              onClick={set("hard")}
            >
              Hard
            </Button>
          </div>

          <div style={{ height: 12 }} />
          <div className="sectionTitle">Audio</div>
          <div className="col">
            <Button variant={props.audio.ui ? "primary" : "default"} onClick={toggleUi}>
              UI Sounds: {props.audio.ui ? "On" : "Off"}
            </Button>
            <Button variant={props.audio.game ? "primary" : "default"} onClick={toggleGame}>
              Gameplay Sounds: {props.audio.game ? "On" : "Off"}
            </Button>
          </div>

          <div style={{ height: 12 }} />
          <div className="sectionTitle">Music</div>
          <div className="col">
            <Button variant={!props.music.muted ? "primary" : "default"} onClick={toggleMusicMuted}>
              Music: {props.music.muted ? "Muted" : "On"}
            </Button>
            <div className="musicRow">
              <span className="small">Volume</span>
              <input
                className="musicSlider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(props.music.volume * 100)}
                onChange={handleMusicVolume}
              />
              <span className="small">{Math.round(props.music.volume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
