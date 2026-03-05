import { describe, expect, it } from 'vitest';

import { action, compose, emit, named, noChange, safeAction, type Action } from '../src';

interface CounterState {
  readonly count: number;
}

type UnionState = IdleState | LoadedState;

interface IdleState {
  readonly type: 'idle';
}

interface LoadedState {
  readonly type: 'loaded';
  readonly value: number;
}

interface TestOutput {
  readonly type: 'saved';
}

describe('action helpers', () => {
  it('action updates state', () => {
    const increment = action<CounterState>((s) => ({ count: s.count + 1 }));
    expect(increment({ count: 1 })).toEqual({ state: { count: 2 } });
  });

  it('emit keeps state and emits output', () => {
    const send = emit<TestOutput>({ type: 'saved' });
    expect(send({ count: 1 })).toEqual({ state: { count: 1 }, output: { type: 'saved' } });
  });

  it('noChange returns same state', () => {
    const noop = noChange<CounterState>();
    const state = { count: 3 };
    expect(noop(state)).toEqual({ state });
  });

  it('compose applies actions in order', () => {
    const inc = action<CounterState>((s) => ({ count: s.count + 1 }));
    const double = action<CounterState>((s) => ({ count: s.count * 2 }));

    const composed = compose(inc, double);
    expect(composed({ count: 2 })).toEqual({ state: { count: 6 } });
  });

  it('named sets action function name', () => {
    const inc = action<CounterState>((s) => ({ count: s.count + 1 }));
    const namedAction = named('increment', inc);
    expect(namedAction.name).toBe('increment');
  });

  it('safeAction runs reducer for matching state type', () => {
    const loadedOnly: Action<UnionState> = safeAction<UnionState, never, 'loaded'>(
      'loaded',
      (state) => ({
        state: { ...state, value: state.value + 1 },
      }),
    );

    expect(loadedOnly({ type: 'loaded', value: 1 })).toEqual({
      state: { type: 'loaded', value: 2 },
    });
  });

  it('safeAction is no-op for non-matching state type', () => {
    const loadedOnly: Action<UnionState> = safeAction<UnionState, never, 'loaded'>(
      'loaded',
      (state) => ({ state: { ...state, value: state.value + 1 } }),
    );

    const state: UnionState = { type: 'idle' };
    expect(loadedOnly(state)).toEqual({ state });
  });

  it('safeAction can emit output', () => {
    const withOutput = safeAction<UnionState, TestOutput, 'loaded'>('loaded', (state) => ({
      state,
      output: { type: 'saved' },
    }));

    expect(withOutput({ type: 'loaded', value: 5 })).toEqual({
      state: { type: 'loaded', value: 5 },
      output: { type: 'saved' },
    });
  });
});
