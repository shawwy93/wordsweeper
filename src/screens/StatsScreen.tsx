import Button from "../components/Button";
import TopBar from "../components/TopBar";
import { computeLevelProgress } from "../progression/leveling";
import { loadProgression } from "../progression/storage";
import { loadStats, resetStats } from "../game/stats";
import { loadCrossStats, resetCrossStats } from "../game/crossStats";
import { loadCrossScores, resetCrossScores } from "../game/crossScore";

export default function StatsScreen(props: { onBack: () => void; mode: "standard" | "cross" }) {
  const progression = loadProgression();
  const levelInfo = computeLevelProgress(progression.totalXP);
  const standardStats = props.mode === "cross" ? null : loadStats();
  const crossStats = props.mode === "cross" ? loadCrossStats() : null;
  const crossScores = props.mode === "cross" ? loadCrossScores() : [];

  function handleReset() {
    if (props.mode === "cross") {
      resetCrossStats();
      resetCrossScores();
    } else {
      resetStats();
    }
    window.location.reload();
  }

  return (
    <div className="screen statsScreen">
      <div className="card statsCard">
        <TopBar title={props.mode === "cross" ? "Cross Sweeper Stats" : "Stats"} right={<Button onClick={props.onBack}>Back</Button>} />
        <div className="statsContent">
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

            {props.mode === "cross" && crossStats && (
              <>
                <div className="scoreRow">
                  <div className="kv">Runs started</div>
                  <div className="vv">{crossStats.gamesStarted}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Moves</div>
                  <div className="vv">{crossStats.playerMoves}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Words</div>
                  <div className="vv">{crossStats.playerWords}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Tiles placed</div>
                  <div className="vv">{crossStats.tilesPlaced}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Total points</div>
                  <div className="vv">{crossStats.pointsScored}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Best move</div>
                  <div className="vv">{crossStats.highestMove}</div>
                </div>
              </>
            )}

            {props.mode === "standard" && standardStats && (
              <>
                <div className="scoreRow">
                  <div className="kv">Games started</div>
                  <div className="vv">{standardStats.gamesStarted}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Wins</div>
                  <div className="vv">{standardStats.wins}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Losses</div>
                  <div className="vv">{standardStats.losses}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Player moves</div>
                  <div className="vv">{standardStats.playerMoves}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">AI moves</div>
                  <div className="vv">{standardStats.aiMoves}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Player words</div>
                  <div className="vv">{standardStats.playerWords}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">AI words</div>
                  <div className="vv">{standardStats.aiWords}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Tiles placed</div>
                  <div className="vv">{standardStats.tilesPlaced}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Total points</div>
                  <div className="vv">{standardStats.pointsScored}</div>
                </div>
                <div className="scoreRow">
                  <div className="kv">Best move</div>
                  <div className="vv">{standardStats.highestMove}</div>
                </div>
              </>
            )}
          </div>

          {props.mode === "cross" && (
            <div style={{ marginTop: 12 }} className="scorePanel card">
              <div className="panelTitle">Cross Sweeper Scores</div>
              {crossScores.length === 0 ? (
                <div className="small" style={{ paddingTop: 6 }}>No scores yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                  {crossScores.map((entry, idx) => (
                    <div key={entry.id} className="scoreRow">
                      <div className="kv">#{idx + 1} {entry.name}</div>
                      <div className="vv">{entry.score} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

