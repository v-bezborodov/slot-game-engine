import { Container } from 'pixi.js';
import { World } from '../ecs/World.ts';
import type { UIAction } from '../ecs/components.ts';
import { InputSystem } from '../systems/InputSystem.ts';
import { RenderSystem } from '../systems/RenderSystem.ts';
import type { Scene, SceneContext, SceneName } from './Scene.ts';

/** Shared ownership and cleanup; entities themselves are only numeric IDs. */
export abstract class BaseScene implements Scene {
  abstract readonly name: SceneName;
  abstract get description(): string;
  readonly root = new Container();
  protected readonly world = new World();
  protected readonly context: SceneContext;
  private readonly renderer = new RenderSystem(this.world, this.root);
  private readonly input = new InputSystem(this.world, this.renderer, (action) => this.handleAction(action));

  constructor(context: SceneContext) { this.context = context; }

  canExit(): boolean { return true; }
  enter(): void { this.build(); this.resize(); }
  exit(): void { this.input.dispose(); }
  resize(): void { this.layout(); this.refresh(); }

  protected refresh(): void {
    this.renderer.sync();
    this.input.sync();
    this.context.render();
  }

  dispose(): void {
    this.input.dispose();
    this.renderer.dispose();
    this.world.clear();
    this.root.removeFromParent();
    this.root.destroy({ children: true });
  }

  protected abstract build(): void;
  protected abstract layout(): void;
  abstract handleAction(action: UIAction): void;
}
