export interface Tile {
  label: string;
  value: string;
  sub?: string;
}

export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="tiles">
      {tiles.map((tile) => (
        <div className="card tile" key={tile.label}>
          <div className="tile-label">{tile.label}</div>
          <div className="tile-value">{tile.value}</div>
          {tile.sub && <div className="tile-sub">{tile.sub}</div>}
        </div>
      ))}
    </div>
  );
}
