import type { Components, Entity, UIAction } from '../ecs/components.ts';
import type { World } from '../ecs/World.ts';

interface PanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: number;
  radius?: number;
}

interface LabelOptions {
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: number;
  weight?: Components['text']['weight'];
  align?: Components['text']['align'];
}

interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  action: UIAction;
  fill?: number;
  color?: number;
}

export function createPanel(world: World, options: PanelOptions): Entity {
  const entity = world.create();
  world.add(entity, 'position', { x: options.x, y: options.y });
  world.add(entity, 'rectangle', {
    width: options.width,
    height: options.height,
    fill: options.fill,
    radius: options.radius ?? 12,
  });
  return entity;
}

export function createLabel(world: World, options: LabelOptions): Entity {
  const entity = world.create();
  world.add(entity, 'position', { x: options.x, y: options.y });
  world.add(entity, 'text', {
    value: options.text,
    size: options.size ?? 20,
    color: options.color ?? 0xffffff,
    weight: options.weight ?? 'normal',
    align: options.align ?? 'left',
  });
  return entity;
}

export function createButton(world: World, options: ButtonOptions): Entity {
  const entity = createPanel(world, { ...options, fill: options.fill ?? 0x193f35 });
  world.add(entity, 'text', {
    value: options.text,
    size: 19,
    color: options.color ?? 0xffffff,
    weight: 'bold',
    align: 'center',
  });
  world.add(entity, 'button', { action: options.action, enabled: true });
  return entity;
}
