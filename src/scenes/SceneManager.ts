import type { Container } from 'pixi.js';
import type { UIAction } from '../ecs/components.ts';
import type { Scene, SceneName } from './Scene.ts';

export class SceneManager {
  private readonly factories = new Map<SceneName, () => Scene>();
  private readonly stage: Container;
  private readonly render: () => void;
  private current: Scene | undefined;

  constructor(stage: Container, render: () => void) {
    this.stage = stage;
    this.render = render;
  }

  get active(): Scene | undefined { return this.current; }

  register(name: SceneName, factory: () => Scene): void {
    this.factories.set(name, factory);
  }

  show(name: SceneName): boolean {
    if (this.current && !this.current.canExit()) return false;
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Scene "${name}" is not registered.`);
    // Construct first: invalid scene data must not destroy the current scene.
    const next = factory();
    this.current?.exit();
    this.current?.dispose();
    this.current = next;
    this.stage.addChild(next.root);
    next.enter();
    this.render();
    return true;
  }

  handleAction(action: UIAction): void { this.current?.handleAction(action); }
  resize(): void { this.current?.resize(); }

  dispose(): void {
    this.current?.exit();
    this.current?.dispose();
    this.current = undefined;
    this.factories.clear();
  }
}
