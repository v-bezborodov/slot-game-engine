import assert from 'node:assert/strict';
import test from 'node:test';
import { World } from '../src/ecs/World.ts';
import { ActionRunner } from '../src/game/ActionRunner.ts';
import { buildActions, type Action } from '../src/game/actions.ts';
import { RoundController } from '../src/game/RoundController.ts';
import { RoundSource, type SpinResult } from '../src/game/RoundSource.ts';
import { RoundStateMachine } from '../src/game/RoundStateMachine.ts';

function fixtures(): { spins: SpinResult[] } {
  return {
    spins: [
      {
        id: 'first',
        grid: [
          ['A', 'B', 'C', 'D', 'E'],
          ['B', 'C', 'D', 'E', 'A'],
          ['C', 'D', 'E', 'A', 'B'],
        ],
        winAmount: 0,
      },
      {
        id: 'second',
        grid: [
          ['E', 'E', 'E', 'E', 'E'],
          ['A', 'B', 'C', 'D', 'A'],
          ['B', 'C', 'D', 'A', 'B'],
        ],
        winAmount: 20,
      },
    ],
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function usefulError(error: unknown): boolean {
  assert.ok(error instanceof Error);
  assert.ok(error.message.trim().length > 0);
  return true;
}

test('World queries by required components and removes destroyed entities', () => {
  const world = new World();
  const button = world.create();
  const label = world.create();
  const empty = world.create();

  world.add(button, 'position', { x: 10, y: 20 });
  world.add(button, 'button', { action: 'spin', enabled: true });
  world.add(label, 'position', { x: 30, y: 40 });
  world.add(label, 'text', { value: 'Ready', size: 18, color: 0xffffff });

  assert.equal(world.size, 3);
  assert.equal(world.get(button, 'position').x, 10);
  assert.equal(world.has(button, 'button'), true);
  assert.equal(world.has(label, 'button'), false);
  assert.deepEqual(new Set(world.query('position')), new Set([button, label]));
  assert.deepEqual(world.query('position', 'button'), [button]);

  world.remove(button, 'button');
  assert.deepEqual(world.query('position', 'button'), []);
  assert.throws(() => world.get(button, 'button'), usefulError);

  world.destroy(label);
  assert.equal(world.size, 2);
  assert.equal(world.has(label, 'position'), false);
  assert.deepEqual(world.query('text'), []);

  world.clear();
  assert.equal(world.size, 0);
  assert.deepEqual(world.query('position'), []);
  assert.equal(world.has(empty, 'position'), false);
});

test('RoundSource starts at the first result and cycles only when advanced', () => {
  const source = new RoundSource(fixtures());

  assert.equal(source.length, 2);
  assert.equal(source.position, 0);
  assert.equal(source.peek().id, 'first');
  assert.equal(source.peek().id, 'first');

  source.advance();
  assert.equal(source.position, 1);
  assert.equal(source.peek().id, 'second');
  source.advance();
  assert.equal(source.position, 0);
  assert.equal(source.peek().id, 'first');
});

test('RoundSource isolates original JSON and returned matrices from mutation', () => {
  const input = fixtures();
  const source = new RoundSource(input);
  const firstRead = source.peek();

  input.spins[0].grid[0][0] = 'E';
  input.spins[0].winAmount = 123;
  // Both immutable snapshots and defensive copies protect the stored fixtures.
  Reflect.set(firstRead.grid[1], '1', 'A');
  Reflect.set(firstRead, 'winAmount', 456);

  const nextRead = source.peek();
  assert.equal(nextRead.grid[0][0], 'A');
  assert.equal(nextRead.grid[1][1], 'C');
  assert.equal(nextRead.winAmount, 0);
});

test('RoundSource rejects malformed fixture input before any spin starts', () => {
  const invalidInputs: unknown[] = [null, {}, { spins: [] }];

  const shortGrid = fixtures();
  shortGrid.spins[0].grid.pop();
  invalidInputs.push(shortGrid);

  const shortRow = fixtures();
  shortRow.spins[1].grid[0].pop();
  invalidInputs.push(shortRow);

  const unknownSymbol = fixtures() as unknown as {
    spins: { grid: string[][] }[];
  };
  unknownSymbol.spins[0].grid[0][0] = 'UNKNOWN';
  invalidInputs.push(unknownSymbol);

  for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalidWin = fixtures();
    invalidWin.spins[0].winAmount = amount;
    invalidInputs.push(invalidWin);
  }

  for (const input of invalidInputs) {
    assert.throws(() => new RoundSource(input), usefulError);
  }
});

test('buildActions produces the grid and declared win without modifying the result', () => {
  const result = fixtures().spins[1];
  const before = structuredClone(result);

  assert.deepEqual(buildActions(result), [
    { type: 'setGrid', grid: before.grid },
    { type: 'setWin', amount: 20 },
  ]);
  assert.deepEqual(result, before);
});

test('ActionRunner waits for a handler before starting the next action', async () => {
  const started = deferred();
  const release = deferred();
  const calls: string[] = [];
  const runner = new ActionRunner({
    setGrid: async () => {
      calls.push('grid:start');
      started.resolve();
      await release.promise;
      calls.push('grid:done');
    },
    setWin: ({ amount }) => {
      calls.push(`win:${amount}`);
    },
  });

  const running = runner.run(buildActions(fixtures().spins[1]));
  await started.promise;
  assert.deepEqual(calls, ['grid:start']);

  release.resolve();
  await running;
  assert.deepEqual(calls, ['grid:start', 'grid:done', 'win:20']);
});

test('ActionRunner stops the scenario on the first failed action', async () => {
  let winWasSet = false;
  const failure = new Error('The grid handler failed');
  const runner = new ActionRunner({
    setGrid: async () => {
      throw failure;
    },
    setWin: () => {
      winWasSet = true;
    },
  });

  await assert.rejects(runner.run(buildActions(fixtures().spins[0])), (error) => {
    assert.equal(error, failure);
    return true;
  });
  assert.equal(winWasSet, false);
});

test('ActionRunner reports missing handlers and unknown runtime actions', async () => {
  const runner = new ActionRunner({ setGrid: () => {} });

  await assert.rejects(
    runner.run([{ type: 'setWin', amount: 10 }]),
    usefulError,
  );
  await assert.rejects(
    runner.run([{ type: 'unknown' }] as unknown as Action[]),
    usefulError,
  );
});

test('RoundStateMachine permits round completion and error recovery only', () => {
  const machine = new RoundStateMachine();
  assert.equal(machine.state, 'idle');
  assert.throws(() => machine.transition('error'), usefulError);
  assert.throws(() => machine.transition('idle'), usefulError);

  machine.transition('running');
  assert.equal(machine.state, 'running');
  assert.throws(() => machine.transition('running'), usefulError);
  machine.transition('error');
  assert.equal(machine.state, 'error');
  assert.throws(() => machine.transition('idle'), usefulError);

  machine.transition('running');
  machine.transition('idle');
  assert.equal(machine.state, 'idle');
});

test('RoundController rejects a duplicate spin while its scenario is running', async () => {
  const source = new RoundSource(fixtures());
  const started = deferred();
  const release = deferred();
  let gridCalls = 0;
  let winCalls = 0;
  const runner = new ActionRunner({
    setGrid: async () => {
      gridCalls += 1;
      started.resolve();
      await release.promise;
    },
    setWin: () => {
      winCalls += 1;
    },
  });
  const controller = new RoundController(source, runner);

  const first = controller.spin();
  await started.promise;
  assert.equal(controller.state, 'running');
  assert.equal(source.position, 0);
  assert.equal(await controller.spin(), false);
  assert.equal(gridCalls, 1);
  assert.equal(winCalls, 0);

  release.resolve();
  assert.equal(await first, true);
  assert.equal(controller.state, 'idle');
  assert.equal(source.position, 1);
  assert.equal(winCalls, 1);
  assert.equal(controller.lastResult?.id, 'first');
});

test('RoundController preserves the cursor after failure and retries the same result', async () => {
  const source = new RoundSource(fixtures());
  const grids: string[] = [];
  let failNext = true;
  let winCalls = 0;
  const runner = new ActionRunner({
    setGrid: ({ grid }) => {
      grids.push(JSON.stringify(grid));
      if (failNext) {
        failNext = false;
        throw new Error('Try this result again');
      }
    },
    setWin: () => {
      winCalls += 1;
    },
  });
  const controller = new RoundController(source, runner);

  assert.equal(await controller.spin(), false);
  assert.equal(controller.state, 'error');
  assert.ok(controller.error);
  assert.equal(source.position, 0);
  assert.equal(winCalls, 0);

  assert.equal(await controller.spin(), true);
  assert.equal(controller.state, 'idle');
  assert.equal(source.position, 1);
  assert.equal(controller.lastResult?.id, 'first');
  assert.equal(grids.length, 2);
  assert.equal(grids[0], grids[1]);
  assert.equal(winCalls, 1);
});
