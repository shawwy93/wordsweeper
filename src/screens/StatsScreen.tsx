import Button from "../components/Button";
import TopBar from "../components/TopBar";
import { computeLevelProgress } from "../progression/leveling";
import { loadProgression } from "../progression/storage";
import { loadStats, resetStats } from "../game/stats";
import { loadCrossScores } from "../game/crossScore";

export default function StatsScreen(props: { onBack: () => void }) {
  const s = loadStats();
  const progression = loadProgression();
  const levelInfo = computeLevelProgress(progression.totalXP);
  const crossScores = loadCrossScores();

  function handleReset() {
    resetStats();
    window.location.reload();
  }

  return (
    <div className="screen">
      <div className="card">
        <TopBar title="Stats" right={<Button onClick={props.onBack}>Back</Button>} />
        <div style={{ padding: 14 }}>
          <div className="scorePanel card" style={{ background: "transparent", boxShadow: "none" }}>
            <div className="scoreRow">
              <div className="kv">Level</div>
              <div className="vv">{levelInfo.level}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">Total XP</div>
              <div className="vv">{progression.totalXP}</div>
            </div>
            <div className="scoreRow">
              <div className="kv">XP to next level</div>
              <div className="vv">{Math.max(levelInfo.target - levelInfo.progress, 0)}</div>
            </div>
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

          <div style={{ marginTop: 12 }} className="scorePanel card">
            <div className="panelTitle">Cross Sweeper Scores</div>
            {crossScores.length === 0 ? (
              <div className="small" style={{ paddingTop: 6 }}>No scores yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                {crossScores.map((entry, idx) => (
                  <div key={entry.id} className="scoreRow">
                    <div className="kv">#{idx + 1}</div>
                    <div className="vv">{entry.score} pts</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 16 }} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={handleReset}>Reset stats</Button>
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
