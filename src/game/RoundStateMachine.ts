export type RoundState = 'idle' | 'running' | 'error';

const transitions: Record<RoundState, readonly RoundState[]> = {
  idle: ['running'],
  running: ['idle', 'error'],
  error: ['running'],
};

export class RoundStateMachine {
  private currentState: RoundState = 'idle';

  get state(): RoundState {
    return this.currentState;
  }

  transition(next: RoundState): void {
    if (!transitions[this.currentState].includes(next)) {
      throw new Error(`Invalid round transition: ${this.currentState} -> ${next}.`);
    }
    this.currentState = next;
  }
}
