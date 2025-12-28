import { BoardCell, PlacedTile, Tile as TileType } from "../game/types";
import tileBase from "../assets/tile-base.png";
import tileBaseLast from "../assets/tile-baseLast.png";

function modLabel(mod: BoardCell["modifier"]) {
  switch (mod) {
    case "DL": return { text: "DL", kind: "good" as const };
    case "TL": return { text: "TL", kind: "good" as const };
    case "DW": return { text: "DW", kind: "good" as const };
    case "TW": return { text: "TW", kind: "good" as const };
    case "EVIL_LETTER": return { text: "EL", kind: "bad" as const };
    case "EVIL_WORD": return { text: "EW", kind: "bad" as const };
    default: return null;
  }
}

export default function Board(props: {
  board: BoardCell[][];
  tilesById: Record<string, TileType>;
  placedThisTurn: PlacedTile[];
  lastRevealAnim: number;
  lastPlayedIds?: string[];
  onTapSquare: (x: number, y: number) => void;
  showHiddenHints?: boolean;
  canDrag?: boolean;
  onDropTile?: (tileId: string, source: "rack" | "board", x: number, y: number) => void;
}) {
  const placedSet = new Set(props.placedThisTurn.map((p) => `${p.x},${p.y}`));
  const lastPlayedSet = new Set(props.lastPlayedIds ?? []);
  const size = props.board.length;

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
    >
      {props.board.map((row, y) =>
        row.map((cell, x) => {
          const isCenter = cell.isCenter;
          const isHidden = !!cell.modifier && !cell.revealed;
          const isRevealed = !!cell.modifier && cell.revealed;
          const hinting = props.showHiddenHints && isHidden;

          const label = cell.revealed ? modLabel(cell.modifier) : null;

          const animate =
            isRevealed && cell.revealedAt && cell.revealedAt >= props.lastRevealAnim;

          const placedNow = placedSet.has(`${x},${y}`);

          const cls =
            "square " +
            (isCenter ? "squareCenter " : "") +
            (isHidden ? "squareHidden " : "") +
            (isRevealed ? "squareRevealed " : "") +
            (hinting ? "squareHint " : "") +
            (animate ? "squareRevealAnim " : "") +
            (placedNow ? "squarePlaced " : "");

          const tile = cell.tileId ? props.tilesById[cell.tileId] : null;
          const hasTile = !!tile;
          const isLastPlayed = tile ? lastPlayedSet.has(tile.id) : false;
          const displayLetter = tile ? cell.letterOverride ?? tile.letter : "";

          return (
            <div
              key={`${x}-${y}`}
              className={cls}
              data-has-tile={hasTile ? "true" : "false"}
              onClick={() => props.onTapSquare(x, y)}
              onDragOver={(event) => {
                if (props.onDropTile) event.preventDefault();
              }}
              onDrop={(event) => {
                if (!props.onDropTile) return;
                event.preventDefault();
                const tileId = event.dataTransfer.getData("text/plain");
                const source = event.dataTransfer.getData("application/x-tile-source") as
                  | "rack"
                  | "board";
                if (!tileId || !source) return;
                props.onDropTile(tileId, source, x, y);
              }}
              role="button"
              aria-label={`Board cell ${x + 1}, ${y + 1}`}
            >
              {label && (
                <div
                  className={
                    "modLabel " + (label.kind === "good" ? "modGood" : "modBad")
                  }
                >
                  {label.text}
                </div>
              )}

              {tile ? (
                <div
                  className={`boardTile ${placedNow ? "boardTilePlaced" : ""} ${isLastPlayed ? "boardTileLast" : ""}`}
                  style={{
                    backgroundImage: `url(${isLastPlayed ? tileBaseLast : tileBase})`,
                    backgroundSize: "125%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                  draggable={!!props.canDrag && placedNow}
                  onDragStart={(event) => {
                    if (!props.canDrag || !placedNow) return;
                    event.dataTransfer.setData("text/plain", tile.id);
                    event.dataTransfer.setData("application/x-tile-source", "board");
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <div className="boardTileLetter">{displayLetter}</div>
                  {tile.value > 0 && <div className="boardTileValue">{tile.value}</div>}
                </div>
              ) : (
                isCenter && (
                  <div style={{ opacity: 0.65, fontSize: 12, fontWeight: 900 }}>
                    START
                  </div>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
