import Button from "../components/Button";
import TopBar from "../components/TopBar";

export default function HowToPlayScreen(props: { onBack: () => void }) {
  return (
    <div className="screen">
      <div className="card">
        <TopBar title="How to Play" right={<Button onClick={props.onBack}>Back</Button>} />
        <div style={{ padding: 14 }}>
          <div className="small" style={{ fontSize: 14, lineHeight: 1.5 }}>
            <p>
              Place tiles to form intersecting words on a 11x11 board.
              Modifiers are <b>random every match</b> and <b>hidden until used</b>.
            </p>
            <p>
              After you submit a move, any hidden modifier you stepped on will
              reveal. It triggers only on the turn it&apos;s first covered.
            </p>
            <ul>
              <li><b>DL/TL</b>: boosts a letter</li>
              <li><b>DW/TW</b>: boosts a word</li>
              <li><b>Evil Letter</b>: subtracts the (multiplied) letter score</li>
              <li><b>Evil Word</b>: subtracts base word score (after letter mult)</li>
            </ul>
            <p>
              The first move must cover the center start square. Tiles placed in a
              single turn must be in one line and touch existing tiles.
            </p>
            <p>
              Game over happens when the bag is empty and someone runs out of tiles,
              after three scoreless turns (passes or swaps) once scoring starts, or
              if a player resigns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
