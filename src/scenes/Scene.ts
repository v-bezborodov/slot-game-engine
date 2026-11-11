import type { Container } from 'pixi.js';
import type { UIAction } from '../ecs/components.ts';

export type SceneName = 'menu' | 'slot';
export interface Viewport { width: number; height: number }
export interface SceneContext {
  viewport: Viewport;
  navigate: (name: SceneName) => void;
  render: () => void;
}

export interface Scene {
  readonly name: SceneName;
  readonly root: Container;
  readonly description: string;
  canExit(): boolean;
  enter(): void;
  exit(): void;
  dispose(): void;
  resize(): void;
  handleAction(action: UIAction): void;
}
