import data from '../data/spins.json';
import type { Entity, UIAction } from '../ecs/components.ts';
import { ActionRunner } from '../game/ActionRunner.ts';
import { RoundController } from '../game/RoundController.ts';
import { RoundSource } from '../game/RoundSource.ts';
import { REELS, ROWS, SYMBOLS } from '../game/symbols.ts';
import { GridSystem } from '../systems/GridSystem.ts';
import { createButton, createLabel, createPanel } from '../ui/factories.ts';
import { BaseScene } from './BaseScene.ts';
import type { SceneContext } from './Scene.ts';

export class SlotScene extends BaseScene {
  readonly name = 'slot';
  private readonly source = new RoundSource(data);
  private readonly grid = new GridSystem(this.world);
  private readonly round: RoundController;
  private readonly cells: Entity[] = [];
  private title!: Entity;
  private subtitle!: Entity;
  private win!: Entity;
  private status!: Entity;
  private spin!: Entity;
  private menu!: Entity;

  constructor(context: SceneContext) {
    super(context);
    this.round = new RoundController(this.source, new ActionRunner({
      setGrid: (action) => { this.grid.setGrid(action.grid); },
      setWin: (action) => { this.world.get(this.win, 'text').value = `Выигрыш: ${action.amount}`; },
    }), () => this.syncRound());
  }

  get description(): string {
    const grid = this.cells.map((id) => this.world.get(id, 'gridCell').symbol).join(' ');
    const win = this.win ? this.world.get(this.win, 'text').value : 'Выигрыш: 0';
    const status = this.round.error ? `Ошибка: ${this.round.error}` : this.round.state === 'running' ? 'Выполняется спин.' : 'Готово к спину.';
    return `Слот 5 на 3. ${win}. ${status} Поле: ${grid}`;
  }

  canExit(): boolean { return this.round.state !== 'running'; }

  protected build(): void {
    this.title = createLabel(this.world, { x: 0, y: 0, text: 'Пять на три', color: 0x193f35, weight: 'bold', align: 'center' });
    this.subtitle = createLabel(this.world, { x: 0, y: 0, text: 'Новая комбинация — одним нажатием', size: 15, color: 0x69756d, align: 'center' });
    const initialGrid = this.source.peek().grid;
    for (let row = 0; row < ROWS; row++) {
      for (let column = 0; column < REELS; column++) {
        const symbol = initialGrid[row][column];
        const entity = createPanel(this.world, { x: 0, y: 0, width: 0, height: 0, fill: SYMBOLS[symbol].fill });
        this.world.add(entity, 'text', { value: symbol, size: 32, color: SYMBOLS[symbol].ink, weight: 'bold', align: 'center' });
        this.world.add(entity, 'gridCell', { row, column, symbol });
        this.cells.push(entity);
      }
    }
    this.win = createLabel(this.world, { x: 0, y: 0, text: 'Выигрыш: 0', size: 32, color: 0x193f35, weight: 'bold', align: 'center' });
    this.status = createLabel(this.world, { x: 0, y: 0, text: 'Нажмите Spin', size: 14, color: 0x69756d, align: 'center' });
    this.menu = createButton(this.world, { x: 0, y: 0, width: 0, height: 52, text: 'В меню', action: 'menu', fill: 0xe9ede4, color: 0x193f35 });
    this.spin = createButton(this.world, { x: 0, y: 0, width: 0, height: 52, text: 'Spin', action: 'spin' });
  }

  protected layout(): void {
    const { width, height } = this.context.viewport;
    const mobile = width < 560;
    const padding = mobile ? 16 : 48;
    const gap = mobile ? 8 : 12;
    const cellWidth = (width - padding * 2 - gap * 4) / REELS;
    const cellHeight = Math.min(mobile ? 76 : 98, cellWidth * 1.18);
    const gridTop = mobile ? 120 : 138;
    const gridBottom = gridTop + cellHeight * ROWS + gap * 2;
    Object.assign(this.world.get(this.title, 'position'), { x: width / 2, y: 30 });
    this.world.get(this.title, 'text').size = mobile ? 30 : 38;
    Object.assign(this.world.get(this.subtitle, 'position'), { x: width / 2, y: mobile ? 77 : 86 });
    this.world.get(this.subtitle, 'text').size = mobile ? 12 : 15;
    for (const entity of this.cells) {
      const { row, column } = this.world.get(entity, 'gridCell');
      Object.assign(this.world.get(entity, 'position'), { x: padding + column * (cellWidth + gap), y: gridTop + row * (cellHeight + gap) });
      Object.assign(this.world.get(entity, 'rectangle'), { width: cellWidth, height: cellHeight, radius: mobile ? 10 : 14 });
      this.world.get(entity, 'text').size = mobile ? 27 : 38;
    }
    Object.assign(this.world.get(this.win, 'position'), { x: width / 2, y: gridBottom + 28 });
    this.world.get(this.win, 'text').size = mobile ? 28 : 34;
    Object.assign(this.world.get(this.status, 'position'), { x: width / 2, y: gridBottom + (mobile ? 74 : 82) });
    this.world.get(this.status, 'text').wrapWidth = width - padding * 2;
    const buttonWidth = (width - padding * 2 - 12) / 2;
    Object.assign(this.world.get(this.menu, 'position'), { x: padding, y: height - 86 });
    Object.assign(this.world.get(this.spin, 'position'), { x: padding + buttonWidth + 12, y: height - 86 });
    this.world.get(this.menu, 'rectangle').width = buttonWidth;
    this.world.get(this.spin, 'rectangle').width = buttonWidth;
  }

  private syncRound(): void {
    const enabled = this.round.state !== 'running';
    this.world.get(this.spin, 'button').enabled = enabled;
    this.world.get(this.menu, 'button').enabled = enabled;
    const status = this.world.get(this.status, 'text');
    status.color = this.round.error ? 0x9f352e : 0x69756d;
    status.size = this.round.error ? 12 : 14;
    status.value = this.round.error ? `Ошибка: ${this.round.error}\nНажмите Spin для повтора.`
      : this.round.state === 'running' ? 'Выполняется спин…'
      : this.round.lastResult ? 'Комбинация установлена' : 'Нажмите Spin';
    this.refresh();
  }

  handleAction(action: UIAction): void {
    if (action === 'spin') void this.round.spin();
    if (action === 'menu' && this.canExit()) this.context.navigate('menu');
  }
}
