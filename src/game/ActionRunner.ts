import type { Action, ActionHandlers } from './actions.ts';

export type { ActionHandlers } from './actions.ts';

export class ActionRunner {
  private readonly handlers: Partial<ActionHandlers>;

  constructor(handlers: Partial<ActionHandlers>) {
    this.handlers = handlers;
  }

  async run(actions: readonly Action[]): Promise<void> {
    for (const action of actions) {
      if (!Object.hasOwn(this.handlers, action.type)) {
        throw new Error(`No handler registered for action "${String(action.type)}".`);
      }
      // The typed registry guarantees the payload at registration; indexing a
      // discriminated union loses that correlation in TypeScript.
      const handler = this.handlers[action.type] as ((value: Action) => void | Promise<void>) | undefined;
      if (typeof handler !== 'function') throw new Error(`Invalid handler for action "${action.type}".`);
      await handler(action);
    }
  }
}
