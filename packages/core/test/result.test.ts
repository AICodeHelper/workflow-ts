import { describe, expect, it } from 'vitest';

import { matchResult, type Action, type Result } from '../src';

interface State {
  readonly value: number;
}

interface Output {
  readonly type: 'failed';
  readonly reason: string;
}

describe('matchResult', () => {
  it('routes success result to success handler', () => {
    const result: Result<number, Error> = { type: 'success', data: 42 };

    const action = matchResult<number, Error, State, Output>(result, {
      success: (data) => (_state) => ({ state: { value: data } }),
      error: (error) => (_state) => ({
        state: { value: 0 },
        output: { type: 'failed', reason: error.message },
      }),
    });

    expect(action({ value: 1 })).toEqual({ state: { value: 42 } });
  });

  it('routes error result to error handler', () => {
    const result: Result<number, Error> = { type: 'error', error: new Error('boom') };

    const action: Action<State, Output> = matchResult<number, Error, State, Output>(result, {
      success: (data) => (_state) => ({ state: { value: data } }),
      error: (error) => (_state) => ({
        state: { value: 0 },
        output: { type: 'failed', reason: error.message },
      }),
    });

    expect(action({ value: 1 })).toEqual({
      state: { value: 0 },
      output: { type: 'failed', reason: 'boom' },
    });
  });
});
