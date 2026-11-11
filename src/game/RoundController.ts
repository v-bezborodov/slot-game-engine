import { ActionRunner } from './ActionRunner.ts';
import { buildActions } from './actions.ts';
import { RoundSource } from './RoundSource.ts';
import type { SpinResult } from './RoundSource.ts';
import { RoundStateMachine } from './RoundStateMachine.ts';
import type { RoundState } from './RoundStateMachine.ts';

export class RoundController {
  private readonly source: RoundSource;
  private readonly runner: ActionRunner;
  private readonly onChange: () => void;
  private readonly machine = new RoundStateMachine();
  error: string | null = null;
  lastResult: SpinResult | null = null;

  constructor(source: RoundSource, runner: ActionRunner, onChange: () => void = () => {}) {
    this.source = source;
    this.runner = runner;
    this.onChange = onChange;
  }

  get state(): RoundState {
    return this.machine.state;
  }

  async spin(): Promise<boolean> {
    if (this.state === 'running') return false;
    this.error = null;
    this.machine.transition('running');

    try {
      this.onChange();
      const result = this.source.peek();
      await this.runner.run(buildActions(result));
      this.source.advance();
      this.lastResult = result;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.machine.transition('error');
      this.onChange();
      return false;
    }

    this.machine.transition('idle');
    this.onChange();
    return true;
  }
}
