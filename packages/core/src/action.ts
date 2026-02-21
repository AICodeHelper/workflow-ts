import type { Action, ActionResult } from './types';

// ============================================================
// Action factories and utilities
// ============================================================

/**
 * Create an action that updates state.
 *
 * @example
 * ```typescript
 * const increment = action((state) => ({ count: state.count + 1 }));
 * ```
 */
export function action<S>(update: (state: S) => S): Action<S>;
export function action<S, O>(update: (state: S) => S, output: O): Action<S, O>;
export function action<S, O>(update: (state: S) => S, output?: O): Action<S, O> {
  return (state: S): ActionResult<S, O> => ({
    state: update(state),
    ...(output !== undefined && { output }),
  });
}

/**
 * Create an action that only emits output without changing state.
 *
 * @example
 * ```typescript
 * const emitResult = emit({ type: 'completed', score: 100 });
 * ```
 */
export function emit<O>(output: O): Action<unknown, O> {
  return (state: unknown): ActionResult<unknown, O> => ({
    state,
    output,
  });
}

/**
 * Create an action that doesn't change state or emit output.
 *
 * @example
 * ```typescript
 * // Useful as a no-op handler
 * ctx.actionSink.send(noChange());
 * ```
 */
export function noChange<S>(): Action<S> {
  return (state: S): ActionResult<S, never> => ({ state });
}

/**
 * Compose multiple actions into one.
 * Actions are applied in order, last output wins.
 *
 * @example
 * ```typescript
 * const resetAndNotify = compose(
 *   (s) => ({ ...s, value: 0 }),
 *   (s) => ({ ...s, resetAt: Date.now() })
 * );
 * ```
 */
export function compose<S, O>(...actions: readonly Action<S, O>[]): Action<S, O> {
  return (initialState: S): ActionResult<S, O> => {
    let state = initialState;
    let finalOutput: O | undefined;

    for (const act of actions) {
      const result = act(state);
      state = result.state;
      if (result.output !== undefined) {
        finalOutput = result.output;
      }
    }

    return {
      state,
      ...(finalOutput !== undefined && { output: finalOutput }),
    };
  };
}

/**
 * Create an action with a name (for debugging).
 *
 * @example
 * ```typescript
 * const increment = named('increment', (s) => ({ count: s.count + 1 }));
 * console.log(increment.name); // 'increment'
 * ```
 */
export function named<S, O>(
  name: string,
  act: Action<S, O>,
): Action<S, O> & { readonly name: string } {
  const namedAction = (state: S): ActionResult<S, O> => act(state);
  Object.defineProperty(namedAction, 'name', {
    value: name,
    writable: false,
    enumerable: true,
    configurable: true,
  });
  return namedAction as Action<S, O> & { readonly name: string };
}
