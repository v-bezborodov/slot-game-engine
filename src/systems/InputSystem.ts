import type { Container } from 'pixi.js';
import type { Entity, UIAction } from '../ecs/components.ts';
import type { World } from '../ecs/World.ts';
import type { RenderSystem } from './RenderSystem.ts';

interface Binding {
  view: Container;
  onTap: () => void;
}

/** Routes a button action to its owning scene, without a global event bus. */
export class InputSystem {
  private readonly bindings = new Map<Entity, Binding>();
  private readonly world: World;
  private readonly renderer: RenderSystem;
  private readonly dispatch: (action: UIAction) => void;

  constructor(world: World, renderer: RenderSystem, dispatch: (action: UIAction) => void) {
    this.world = world;
    this.renderer = renderer;
    this.dispatch = dispatch;
  }

  sync(): void {
    const buttons = new Set<Entity>();
    for (const entity of this.world.query('button', 'position')) {
      const view = this.renderer.getView(entity);
      if (!view) continue;
      buttons.add(entity);
      const previous = this.bindings.get(entity);
      if (previous && previous.view !== view) this.unbind(entity, previous);
      if (!this.bindings.has(entity)) {
        const onTap = () => {
          if (!this.world.has(entity, 'button')) return;
          const button = this.world.get(entity, 'button');
          if (button.enabled) this.dispatch(button.action);
        };
        view.on('pointertap', onTap);
        this.bindings.set(entity, { view, onTap });
      }
      const enabled = this.world.get(entity, 'button').enabled;
      view.eventMode = enabled ? 'static' : 'none';
      view.cursor = enabled ? 'pointer' : 'default';
    }

    for (const [entity, binding] of this.bindings) {
      if (!buttons.has(entity)) this.unbind(entity, binding);
    }
  }

  private unbind(entity: Entity, binding: Binding): void {
    binding.view.off('pointertap', binding.onTap);
    if (!binding.view.destroyed) {
      binding.view.eventMode = 'none';
      binding.view.cursor = 'default';
    }
    this.bindings.delete(entity);
  }

  dispose(): void {
    for (const [entity, binding] of this.bindings) this.unbind(entity, binding);
  }
}
