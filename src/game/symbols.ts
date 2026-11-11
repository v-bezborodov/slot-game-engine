export const SYMBOLS = {
  A: { fill: 0xf3bf68, ink: 0x65411a },
  B: { fill: 0x9bc5b0, ink: 0x224c40 },
  C: { fill: 0xaac2e5, ink: 0x294d76 },
  D: { fill: 0xc9b3d9, ink: 0x56346d },
  E: { fill: 0xe6aaa0, ink: 0x763d34 },
} as const;

export type SymbolKey = keyof typeof SYMBOLS;
export const ROWS = 3;
export const REELS = 5;
