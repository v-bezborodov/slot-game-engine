import type { Entity, UIAction } from '../ecs/components.ts';
import { SYMBOLS } from '../game/symbols.ts';
import { createButton, createLabel, createPanel } from '../ui/factories.ts';
import { BaseScene } from './BaseScene.ts';

export class MenuScene extends BaseScene {
  readonly name = 'menu';
  private title!: Entity;
  private subtitle!: Entity;
  private start!: Entity;
  private readonly symbols: Entity[] = [];

  get description(): string { return 'Главное меню. Простой слот. Нажмите Начать или Enter.'; }

  protected build(): void {
    this.title = createLabel(this.world, { x: 0, y: 0, text: 'Простой слот', color: 0x193f35, weight: 'bold', align: 'center' });
    this.subtitle = createLabel(this.world, { x: 0, y: 0, text: '5 барабанов · 3 ряда', size: 17, color: 0x69756d, align: 'center' });
    for (const [symbol, palette] of Object.entries(SYMBOLS)) {
      const entity = createPanel(this.world, { x: 0, y: 0, width: 0, height: 0, fill: palette.fill });
      this.world.add(entity, 'text', { value: symbol, size: 32, color: palette.ink, weight: 'bold', align: 'center' });
      this.symbols.push(entity);
    }
    this.start = createButton(this.world, { x: 0, y: 0, width: 200, height: 56, text: 'Начать', action: 'start' });
  }

  protected layout(): void {
    const { width, height } = this.context.viewport;
    const mobile = width < 560;
    const center = width / 2;
    Object.assign(this.world.get(this.title, 'position'), { x: center, y: height * 0.20 });
    this.world.get(this.title, 'text').size = mobile ? 32 : 48;
    Object.assign(this.world.get(this.subtitle, 'position'), { x: center, y: height * 0.20 + (mobile ? 54 : 70) });
    const size = Math.min(88, (width - 64) / 5 - 8);
    const totalWidth = size * 5 + 8 * 4;
    this.symbols.forEach((entity, i) => {
      Object.assign(this.world.get(entity, 'position'), { x: center - totalWidth / 2 + i * (size + 8), y: height * 0.45 });
      Object.assign(this.world.get(entity, 'rectangle'), { width: size, height: size, radius: mobile ? 10 : 14 });
      this.world.get(entity, 'text').size = mobile ? 26 : 36;
    });
    Object.assign(this.world.get(this.start, 'position'), { x: center - 100, y: height * 0.72 });
  }

  handleAction(action: UIAction): void {
    if (action === 'start') this.context.navigate('slot');
  }
}
