import type { Difficulty } from "../game/types";

export default function MenuScreen(props: {
  onPlay: () => void;
  onHow: () => void;
  onSettings: () => void;
  onStats: () => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
}) {
  return (
    <div className="screen screenMenu">
      <div className="menuLayout">
        <div className="menuHeaderSpacer" aria-hidden="true" />
        <div className="menuStack">
          <button className="menuAction primary" type="button" onClick={props.onPlay}>
            Play
          </button>
          <div className="menuSecondary">
            <button className="menuSecondaryAction" type="button" onClick={props.onStats}>
              Stats
            </button>
            <button className="menuSecondaryAction" type="button" onClick={props.onSettings}>
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
