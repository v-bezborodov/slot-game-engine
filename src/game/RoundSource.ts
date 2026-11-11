import { REELS, ROWS, SYMBOLS } from './symbols.ts';
import type { SymbolKey } from './symbols.ts';

export type Grid = readonly (readonly SymbolKey[])[];

export type SpinResult = {
  readonly id: string;
  readonly grid: Grid;
  readonly winAmount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readResult(input: unknown, index: number): SpinResult {
  const label = `spins[${index}]`;
  if (!isRecord(input)) throw new Error(`${label} must be an object.`);
  const { id, grid, winAmount } = input;
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`${label}.id must be a non-empty string.`);
  }
  if (typeof winAmount !== 'number' || !Number.isFinite(winAmount) || winAmount < 0) {
    throw new Error(`${label}.winAmount must be a finite, non-negative number.`);
  }
  if (!Array.isArray(grid) || grid.length !== ROWS) {
    throw new Error(`${label}.grid must have exactly ${ROWS} rows.`);
  }
  const copiedGrid: Grid = Object.freeze(Array.from(grid, (row: unknown, rowIndex: number) => {
    if (!Array.isArray(row) || row.length !== REELS) {
      throw new Error(`${label}.grid[${rowIndex}] must have exactly ${REELS} symbols.`);
    }
    const copiedRow: SymbolKey[] = [];
    for (const symbol of row as unknown[]) {
      if (typeof symbol !== 'string' || !Object.hasOwn(SYMBOLS, symbol)) {
        throw new Error(`${label}.grid[${rowIndex}] contains an unknown symbol: ${String(symbol)}.`);
      }
      copiedRow.push(symbol as SymbolKey);
    }
    return Object.freeze(copiedRow);
  }));
  return Object.freeze({ id, grid: copiedGrid, winAmount });
}

export class RoundSource {
  private readonly results: readonly SpinResult[];
  private cursor = 0;

  constructor(input: unknown) {
    if (!isRecord(input) || !Array.isArray(input.spins) || input.spins.length === 0) {
      throw new Error('Spin data must contain a non-empty "spins" array.');
    }
    this.results = Object.freeze(Array.from(input.spins, readResult));
  }

  get position(): number {
    return this.cursor;
  }

  get length(): number {
    return this.results.length;
  }

  peek(): SpinResult {
    return this.results[this.cursor]!;
  }

  advance(): void {
    this.cursor = (this.cursor + 1) % this.results.length;
  }
}
