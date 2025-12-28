export default function ScorePanel(props: {
  scores: { player: number; ai: number };
  bagCount: number;
}) {
  return (
    <div className="card scorePanel">
      <div className="scoreRow">
        <div className="kv">You</div>
        <div className="vv">{props.scores.player}</div>
      </div>
      <div className="scoreRow">
        <div className="kv">AI</div>
        <div className="vv">{props.scores.ai}</div>
      </div>
      <div className="scoreRow">
        <div className="kv">Bag</div>
        <div className="vv">{props.bagCount}</div>
      </div>
    </div>
  );
}
