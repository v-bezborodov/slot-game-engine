import type { World } from '../ecs/World.ts';
import type { Grid } from '../game/RoundSource.ts';
import { REELS, ROWS, SYMBOLS } from '../game/symbols.ts';

/** Applies a row-major result to the existing grid entities. */
export class GridSystem {
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  setGrid(grid: Grid): void {
    if (grid.length !== ROWS || grid.some((row) => !Array.isArray(row) || row.length !== REELS)) {
      throw new Error(`Grid must contain ${ROWS} rows of ${REELS} symbols.`);
    }
    for (const row of grid) {
      for (const key of row) {
        if (!Object.hasOwn(SYMBOLS, key)) throw new Error(`Unknown grid symbol: ${String(key)}.`);
      }
    }

    const entities = this.world.query('gridCell', 'rectangle', 'text');
    const coordinates = new Set<string>();
    for (const entity of entities) {
      const { row, column } = this.world.get(entity, 'gridCell');
      if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row >= ROWS || column < 0 || column >= REELS) {
        throw new Error(`Grid cell has invalid coordinates (${row}, ${column}).`);
      }
      const key = `${row}:${column}`;
      if (coordinates.has(key)) throw new Error(`Duplicate grid cell (${row}, ${column}).`);
      coordinates.add(key);
    }
    if (entities.length !== ROWS * REELS) throw new Error(`Grid requires ${ROWS * REELS} complete cell entities.`);

    // Validate first, so malformed data cannot partially overwrite the grid.
    for (const entity of entities) {
      const cell = this.world.get(entity, 'gridCell');
      const symbol = grid[cell.row][cell.column];
      cell.symbol = symbol;
      this.world.get(entity, 'rectangle').fill = SYMBOLS[symbol].fill;
      const text = this.world.get(entity, 'text');
      text.value = symbol;
      text.color = SYMBOLS[symbol].ink;
    }
  }
}
