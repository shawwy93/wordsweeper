import Button from "../components/Button";
import TopBar from "../components/TopBar";
import { loadStats } from "../game/stats";

export default function StatsScreen(props: { onBack: () => void }) {
  const s = loadStats();

  return (
    <div className="screen">
      <div className="card">
        <TopBar title="Stats" right={<Button onClick={props.onBack}>Back</Button>} />
        <div style={{ padding: 14 }}>
          <div className="scorePanel card" style={{ background: "transparent", boxShadow: "none" }}>
            <div className="scoreRow">
              <div className="kv">Games started</div>
              <div className="vv">{s.gamesStarted}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Wins</div>
              <div className="vv">{s.wins}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Losses</div>
              <div className="vv">{s.losses}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Player moves</div>
              <div className="vv">{s.playerMoves}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">AI moves</div>
              <div className="vv">{s.aiMoves}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Player words</div>
              <div className="vv">{s.playerWords}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">AI words</div>
              <div className="vv">{s.aiWords}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Tiles placed</div>
              <div className="vv">{s.tilesPlaced}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Total points</div>
              <div className="vv">{s.pointsScored}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Best move</div>
              <div className="vv">{s.highestMove}</div>
            </div>
          </div>

          <div style={{ height: 10 }} />
          <div className="small">
            Stats are stored locally on this device.
          </div>
        </div>
      </div>
    </div>
  );
}
