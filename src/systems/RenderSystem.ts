import { Container, Graphics, Text as PixiText } from 'pixi.js';
import type { Entity } from '../ecs/components.ts';
import type { World } from '../ecs/World.ts';

interface View {
  container: Container;
  rectangle?: Graphics;
  text?: PixiText;
  rectangleKey?: string;
  textKey?: string;
}

/** Owns Pixi objects; ECS components contain only data. */
export class RenderSystem {
  private readonly views = new Map<Entity, View>();
  private readonly world: World;
  private readonly root: Container;

  constructor(world: World, root: Container) {
    this.world = world;
    this.root = root;
  }

  sync(): void {
    const visible = new Set<Entity>();
    for (const entity of this.world.query('position')) {
      const hasRectangle = this.world.has(entity, 'rectangle');
      const hasText = this.world.has(entity, 'text');
      if (!hasRectangle && !hasText) continue;
      visible.add(entity);

      let view = this.views.get(entity);
      if (!view) {
        view = { container: new Container() };
        this.views.set(entity, view);
        this.root.addChild(view.container);
      }
      const position = this.world.get(entity, 'position');
      view.container.position.set(position.x, position.y);
      view.container.alpha = this.world.has(entity, 'button') && !this.world.get(entity, 'button').enabled ? 0.45 : 1;

      if (hasRectangle) {
        const rectangle = this.world.get(entity, 'rectangle');
        if (!view.rectangle) {
          view.rectangle = new Graphics();
          view.container.addChildAt(view.rectangle, 0);
        }
        const key = `${rectangle.width}:${rectangle.height}:${rectangle.fill}:${rectangle.radius ?? 0}`;
        if (view.rectangleKey !== key) {
          view.rectangle.clear().roundRect(0, 0, rectangle.width, rectangle.height, rectangle.radius ?? 0).fill(rectangle.fill);
          view.rectangleKey = key;
        }
      } else if (view.rectangle) {
        view.rectangle.destroy();
        view.rectangle = undefined;
        view.rectangleKey = undefined;
      }

      if (hasText) {
        const text = this.world.get(entity, 'text');
        if (!view.text) {
          view.text = new PixiText({ text: text.value });
          view.container.addChild(view.text);
        }
        const key = `${text.size}:${text.color}:${text.weight ?? 'normal'}:${text.align ?? 'left'}:${text.wrapWidth ?? 0}`;
        if (view.textKey !== key) {
          view.text.style = {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: text.size,
            fill: text.color,
            fontWeight: text.weight ?? 'normal',
            align: text.align ?? 'left',
            wordWrap: text.wrapWidth !== undefined,
            wordWrapWidth: text.wrapWidth ?? 0,
          };
          view.textKey = key;
        }
        if (view.text.text !== text.value) view.text.text = text.value;
        if (hasRectangle) {
          const rectangle = this.world.get(entity, 'rectangle');
          view.text.anchor.set(text.align === 'center' ? 0.5 : 0, 0.5);
          view.text.position.set(text.align === 'center' ? rectangle.width / 2 : 12, rectangle.height / 2);
        } else {
          view.text.anchor.set(text.align === 'center' ? 0.5 : 0, 0);
          view.text.position.set(0, 0);
        }
      } else if (view.text) {
        view.text.destroy();
        view.text = undefined;
        view.textKey = undefined;
      }
    }

    for (const [entity, view] of this.views) {
      if (!visible.has(entity)) {
        view.container.destroy({ children: true });
        this.views.delete(entity);
      }
    }
  }

  getView(entity: Entity): Container | undefined {
    return this.views.get(entity)?.container;
  }

  dispose(): void {
    for (const view of this.views.values()) view.container.destroy({ children: true });
    this.views.clear();
  }
}
