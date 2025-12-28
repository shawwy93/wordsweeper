import type { DragEvent } from "react";
import { Tile as TileType } from "../game/types";
import Tile from "./Tile";

export default function Rack(props: {
  rack: TileType[];
  selectedTileId: string | null;
  onSelect: (tileId: string) => void;
  draggable?: boolean;
  onTileDragStart?: (tileId: string, event: DragEvent<HTMLDivElement>) => void;
  onDropTile?: (tileId: string, source: "rack" | "board") => void;
}) {
  return (
    <div
      className="rack"
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
        props.onDropTile(tileId, source);
      }}
    >
      {props.rack.map((t) => (
        <Tile
          key={t.id}
          tile={t}
          selected={props.selectedTileId === t.id}
          onClick={() => props.onSelect(t.id)}
          draggable={props.draggable}
          onDragStart={
            props.onTileDragStart
              ? (event) => props.onTileDragStart?.(t.id, event)
              : undefined
          }
        />
      ))}
    </div>
  );
}
