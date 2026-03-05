import { describe, expect, it } from 'vitest';

import { routeChildOutput, type Action } from '../src';

interface ParentState {
  readonly value: number;
}

type ParentOutput =
  | { readonly type: 'saved'; readonly id: string }
  | { readonly type: 'cancelled' };

type ChildOutput =
  | { readonly type: 'success'; readonly id: string }
  | { readonly type: 'cancel' }
  | { readonly type: 'unknown' };

describe('routeChildOutput', () => {
  it('routes output by type', () => {
    const router = routeChildOutput<ChildOutput, ParentState, ParentOutput>({
      success: (output) => () => ({
        state: { value: 1 },
        output: { type: 'saved', id: output.id },
      }),
      cancel: () => () => ({
        state: { value: 0 },
        output: { type: 'cancelled' },
      }),
    });

    const successAction: Action<ParentState, ParentOutput> = router({ type: 'success', id: 'abc' });
    expect(successAction({ value: 10 })).toEqual({
      state: { value: 1 },
      output: { type: 'saved', id: 'abc' },
    });

    const cancelAction = router({ type: 'cancel' });
    expect(cancelAction({ value: 10 })).toEqual({
      state: { value: 0 },
      output: { type: 'cancelled' },
    });
  });

  it('uses fallback when no specific handler exists', () => {
    const router = routeChildOutput<ChildOutput, ParentState, ParentOutput>(
      {
        success: (output) => () => ({
          state: { value: 1 },
          output: { type: 'saved', id: output.id },
        }),
      },
      (output) => () => ({
        state: { value: output.type.length },
        output: { type: 'cancelled' },
      }),
    );

    const actionFromFallback = router({ type: 'cancel' });
    expect(actionFromFallback({ value: 10 })).toEqual({
      state: { value: 6 },
      output: { type: 'cancelled' },
    });
  });

  it('throws if output type is missing and fallback is not provided', () => {
    const router = routeChildOutput<ChildOutput, ParentState, ParentOutput>({
      success: (output) => () => ({
        state: { value: 1 },
        output: { type: 'saved', id: output.id },
      }),
    });

    expect(() => {
      router({ type: 'unknown' });
    }).toThrow('No child output handler registered for type "unknown"');
  });
});
