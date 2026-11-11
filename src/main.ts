import { Application, EventsTicker, Ticker } from 'pixi.js';
import { MenuScene } from './scenes/MenuScene.ts';
import type { SceneContext, Viewport } from './scenes/Scene.ts';
import { SceneManager } from './scenes/SceneManager.ts';
import { SlotScene } from './scenes/SlotScene.ts';
import './style.css';

const host = document.querySelector<HTMLElement>('#game')!;
const status = document.querySelector<HTMLElement>('#game-status')!;
const sceneError = document.querySelector<HTMLElement>('#game-error')!;

async function boot(): Promise<void> {
  const viewport: Viewport = { width: host.clientWidth, height: host.clientWidth < 560 ? 560 : 680 };
  const app = new Application();
  await app.init({ ...viewport, background: 0xfffef9, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
    autoStart: false, sharedTicker: false, gcActive: false });
  // Static buttons use native events; synthetic pointer updates need no RAF.
  EventsTicker.removeTickerListener();
  // This standalone app disposes scene resources explicitly. Pixi's background
  // scheduler also uses the system ticker, so stop it for this static demo.
  Ticker.system.autoStart = false;
  Ticker.system.stop();
  const canvas = app.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  host.append(canvas);

  const render = () => {
    app.render();
    const description = scenes.active?.description ?? '';
    if (status.textContent !== description) status.textContent = description;
    canvas.setAttribute('aria-label', description);
  };
  const scenes = new SceneManager(app.stage, render);
  const context: SceneContext = { viewport, render, navigate: (name) => {
    try {
      scenes.show(name);
      sceneError.hidden = true;
    } catch (error) {
      sceneError.textContent = `Не удалось открыть сцену: ${error instanceof Error ? error.message : String(error)}`;
      sceneError.hidden = false;
    }
  } };
  scenes.register('menu', () => new MenuScene(context));
  scenes.register('slot', () => new SlotScene(context));
  scenes.show('menu');

  const focusCanvas = () => canvas.focus({ preventScroll: true });
  const onKey = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scenes.handleAction(scenes.active?.name === 'menu' ? 'start' : 'spin');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      scenes.handleAction('menu');
    }
  };
  canvas.addEventListener('pointerdown', focusCanvas);
  canvas.addEventListener('keydown', onKey);
  focusCanvas();
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = width < 560 ? 560 : 680;
    if (width === viewport.width && height === viewport.height) return;
    Object.assign(viewport, { width, height });
    app.renderer.resize(width, height);
    scenes.resize();
  });
  resize.observe(host);

  const onPageHide = (event: PageTransitionEvent) => { if (!event.persisted) dispose(); };
  const dispose = () => {
    window.removeEventListener('pagehide', onPageHide);
    resize.disconnect();
    canvas.removeEventListener('pointerdown', focusCanvas);
    canvas.removeEventListener('keydown', onKey);
    scenes.dispose();
    app.destroy(true, { children: true });
  };
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  window.addEventListener('pagehide', onPageHide);
}

void boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const alert = document.createElement('p');
  alert.className = 'error';
  alert.setAttribute('role', 'alert');
  alert.textContent = `Не удалось запустить игру: ${message}`;
  host.replaceChildren(alert);
});
