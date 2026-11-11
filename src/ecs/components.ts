import type { SymbolKey } from '../game/symbols.ts';

export type Entity = number;
export type UIAction = 'start' | 'spin' | 'menu';

export interface Components {
  position: { x: number; y: number };
  rectangle: { width: number; height: number; fill: number; radius?: number };
  text: {
    value: string;
    size: number;
    color: number;
    weight?: 'normal' | 'bold';
    align?: 'left' | 'center';
    wrapWidth?: number;
  };
  button: { action: UIAction; enabled: boolean };
  gridCell: { row: number; column: number; symbol: SymbolKey };
}

export type ComponentName = keyof Components;
