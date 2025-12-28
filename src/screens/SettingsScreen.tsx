import Button from "../components/Button";
import TopBar from "../components/TopBar";
import { Difficulty } from "../game/types";

export default function SettingsScreen(props: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onBack: () => void;
}) {
  const set = (d: Difficulty) => () => props.setDifficulty(d);

  return (
    <div className="screen">
      <div className="card">
        <TopBar title="Settings" right={<Button onClick={props.onBack}>Back</Button>} />
        <div style={{ padding: 14 }}>
          <div className="small" style={{ marginBottom: 10 }}>
            Difficulty affects how deep the AI searches (once implemented). The AI will never know
            hidden modifiers before they are revealed on the board.
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

          <div style={{ height: 10 }} />
          <div className="small">
            Later: toggle sounds, haptics, color-blind mode, and stronger reveal highlights.
          </div>
        </div>
      </div>
    </div>
  );
}
