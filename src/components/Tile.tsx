import type { DragEvent } from "react";
import { Tile as TileType } from "../game/types";
import tileBase from "../assets/tile-base.png";

export default function Tile(props: {
  tile: TileType;
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={"tile " + (props.selected ? "tileSelected" : "")}
      onClick={props.onClick}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
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
