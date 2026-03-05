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
 * Create a state-guarded action for discriminated union states.
 * If current state type doesn't match, action becomes a no-op.
 *
 * @example
 * ```typescript
 * type State = { type: 'idle' } | { type: 'loaded'; value: number };
 *
 * const loadedOnly = safeAction<State, never, 'loaded'>('loaded', (s) => ({
 *   state: { ...s, value: s.value + 1 },
 * }));
 * ```
 */
export function safeAction<S extends { type: string }, O, K extends S['type']>(
  expectedType: K,
  reducer: (state: Extract<S, { type: K }>) => ActionResult<S, O>,
): Action<S, O> {
  return (state: S): ActionResult<S, O> => {
    if (state.type !== expectedType) {
      return { state };
    }

    return reducer(state as Extract<S, { type: K }>);
  };
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
