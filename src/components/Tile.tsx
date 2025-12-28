import type { DragEvent, PointerEvent } from "react";
import { Tile as TileType } from "../game/types";
import tileBase from "../assets/tile-base.png";

export default function Tile(props: {
  tile: TileType;
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  dataTileId?: string;
  dataRackTile?: boolean;
}) {

  return (
    <div
      className={"tile " + (props.selected ? "tileSelected" : "")}
      onClick={props.onClick}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onPointerDown={props.onPointerDown}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      data-tile-id={props.dataTileId}
      data-rack-tile={props.dataRackTile ? "true" : undefined}
      role="button"
      aria-label={props.tile.isBlank ? "Blank tile" : `Tile ${props.tile.letter} value ${props.tile.value}`}
      style={{
        backgroundImage: `url(${tileBase})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {!props.tile.isBlank && <div className="tileLetter">{props.tile.letter}</div>}
      {props.tile.value > 0 && <div className="tileValue">{props.tile.value}</div>}
    </div>
  );
}

