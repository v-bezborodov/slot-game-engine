import type { ComponentName, Components, Entity } from './components.ts';

export class World {
  private readonly entities = new Set<Entity>();
  private nextEntity = 1;
  private readonly components: { [K in ComponentName]: Map<Entity, Components[K]> } = {
    position: new Map(),
    rectangle: new Map(),
    text: new Map(),
    button: new Map(),
    gridCell: new Map(),
  };

  get size(): number {
    return this.entities.size;
  }

  create(): Entity {
    const entity = this.nextEntity++;
    this.entities.add(entity);
    return entity;
  }

  add<K extends ComponentName>(entity: Entity, name: K, value: Components[K]): void {
    if (!this.entities.has(entity)) throw new Error(`Entity ${entity} does not exist.`);
    this.components[name].set(entity, value);
  }

  get<K extends ComponentName>(entity: Entity, name: K): Components[K] {
    const component = this.components[name].get(entity);
    if (component === undefined) throw new Error(`Entity ${entity} has no "${name}" component.`);
    return component;
  }

  has(entity: Entity, name: ComponentName): boolean {
    return this.components[name].has(entity);
  }

  remove(entity: Entity, name: ComponentName): void {
    this.components[name].delete(entity);
  }

  destroy(entity: Entity): void {
    for (const store of Object.values(this.components)) store.delete(entity);
    this.entities.delete(entity);
  }

  query(...names: ComponentName[]): Entity[] {
    return [...this.entities].filter((entity) => names.every((name) => this.has(entity, name)));
  }

  clear(): void {
    for (const store of Object.values(this.components)) store.clear();
    this.entities.clear();
  }
}
