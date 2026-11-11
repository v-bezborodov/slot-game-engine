import type { Grid, SpinResult } from './RoundSource.ts';

export type Action =
  | { type: 'setGrid'; grid: Grid }
  | { type: 'setWin'; amount: number };

export type ActionHandlers = {
  [K in Action['type']]: (action: Extract<Action, { type: K }>) => void | Promise<void>;
};

export function buildActions(result: SpinResult): Action[] {
  return [
    { type: 'setGrid', grid: result.grid },
    { type: 'setWin', amount: result.winAmount },
  ];
}
