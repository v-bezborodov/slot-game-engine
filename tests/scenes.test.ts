import assert from 'node:assert/strict';
import test from 'node:test';
import type { Container } from 'pixi.js';
import type { UIAction } from '../src/ecs/components.ts';
import type { Scene, SceneName } from '../src/scenes/Scene.ts';
import { SceneManager } from '../src/scenes/SceneManager.ts';

class FakeStage {
  readonly children: Container[] = [];

  addChild(root: Container): void {
    this.children.push(root);
  }

  remove(root: Container): void {
    const index = this.children.indexOf(root);
    if (index !== -1) this.children.splice(index, 1);
  }
}

class FakeScene implements Scene {
  readonly name: SceneName;
  readonly root = {} as Container;
  readonly description = 'Fake scene';
  readonly actions: UIAction[] = [];
  canLeave = true;
  resizeCount = 0;
  private readonly id: string;
  private readonly stage: FakeStage;
  private readonly log: string[];

  constructor(name: SceneName, id: string, stage: FakeStage, log: string[]) {
    this.name = name;
    this.id = id;
    this.stage = stage;
    this.log = log;
    log.push(`${id}:create`);
  }

  canExit(): boolean { return this.canLeave; }
  enter(): void { this.log.push(`${this.id}:enter`); }
  exit(): void { this.log.push(`${this.id}:exit`); }
  dispose(): void {
    this.log.push(`${this.id}:dispose`);
    this.stage.remove(this.root);
  }
  resize(): void { this.resizeCount++; }
  handleAction(action: UIAction): void { this.actions.push(action); }
}

function setup() {
  const log: string[] = [];
  const stage = new FakeStage();
  const manager = new SceneManager(stage as unknown as Container, () => log.push('render'));
  const created = { menu: [] as FakeScene[], slot: [] as FakeScene[] };
  for (const name of ['menu', 'slot'] as const) {
    manager.register(name, () => {
      const scene = new FakeScene(name, `${name}-${created[name].length + 1}`, stage, log);
      created[name].push(scene);
      return scene;
    });
  }
  return { manager, stage, log, created };
}

test('SceneManager blocks navigation before constructing a scene when canExit is false', () => {
  const { manager, stage, log, created } = setup();
  manager.show('menu');
  const menu = created.menu[0];
  menu.canLeave = false;
  log.length = 0;

  assert.equal(manager.show('slot'), false);
  assert.equal(manager.active, menu);
  assert.equal(created.slot.length, 0);
  assert.deepEqual(stage.children, [menu.root]);
  assert.deepEqual(log, []);

  menu.canLeave = true;
  assert.equal(manager.show('slot'), true);
});

test('SceneManager exits and disposes the old scene before entering the replacement', () => {
  const { manager, stage, log, created } = setup();
  manager.show('menu');
  log.length = 0;

  assert.equal(manager.show('slot'), true);
  assert.deepEqual(log, ['slot-1:create', 'menu-1:exit', 'menu-1:dispose', 'slot-1:enter', 'render']);
  assert.equal(manager.active, created.slot[0]);
  assert.deepEqual(stage.children, [created.slot[0].root]);
});

test('Menu -> Slot -> Menu -> Slot creates fresh scenes and routes actions only to the active one', () => {
  const { manager, created, stage } = setup();
  manager.show('menu');
  const firstMenu = created.menu[0];
  manager.handleAction('start');
  manager.resize();
  manager.show('slot');
  const firstSlot = created.slot[0];
  manager.handleAction('spin');
  manager.show('menu');
  manager.handleAction('start');
  manager.show('slot');
  manager.handleAction('spin');
  manager.resize();

  assert.equal(created.menu.length, 2);
  assert.equal(created.slot.length, 2);
  assert.notEqual(created.menu[1], firstMenu);
  assert.notEqual(created.slot[1], firstSlot);
  assert.deepEqual(firstMenu.actions, ['start']);
  assert.deepEqual(firstSlot.actions, ['spin']);
  assert.deepEqual(created.menu[1].actions, ['start']);
  assert.deepEqual(created.slot[1].actions, ['spin']);
  assert.equal(firstMenu.resizeCount, 1);
  assert.equal(firstSlot.resizeCount, 0);
  assert.equal(created.slot[1].resizeCount, 1);
  assert.deepEqual(stage.children, [created.slot[1].root]);
});

test('SceneManager preserves the current scene if a replacement factory fails', () => {
  const { manager, stage, log, created } = setup();
  manager.show('menu');
  const menu = created.menu[0];
  manager.register('slot', () => { throw new Error('Invalid spin data'); });
  log.length = 0;

  assert.throws(() => manager.show('slot'), /Invalid spin data/);
  assert.equal(manager.active, menu);
  assert.deepEqual(stage.children, [menu.root]);
  assert.deepEqual(log, []);
  manager.handleAction('start');
  assert.deepEqual(menu.actions, ['start']);
});

test('SceneManager disposal releases the active scene and stops action and resize dispatch', () => {
  const { manager, stage, log, created } = setup();
  manager.show('slot');
  const slot = created.slot[0];
  log.length = 0;

  manager.dispose();
  manager.handleAction('spin');
  manager.resize();
  manager.dispose();

  assert.equal(manager.active, undefined);
  assert.deepEqual(stage.children, []);
  assert.deepEqual(log, ['slot-1:exit', 'slot-1:dispose']);
  assert.deepEqual(slot.actions, []);
  assert.equal(slot.resizeCount, 0);
  assert.throws(() => manager.show('menu'), /not registered/);
});
