import type { Action } from './types';

export type ChildOutputHandlers<CO extends { type: string }, S, O> = {
  readonly [K in CO['type']]?: (output: Extract<CO, { type: K }>) => Action<S, O>;
};

/**
 * Build a typed output router for child workflow outputs.
 *
 * @example
 * ```typescript
 * const onChildOutput = routeChildOutput<ChildOutput, ParentState, ParentOutput>({
 *   success: (output) => () => ({ state: { ... }, output: { type: 'saved', id: output.id } }),
 *   cancel: () => () => ({ state: { ... } }),
 * });
 * ```
 */
export function routeChildOutput<CO extends { type: string }, S, O>(
  handlers: ChildOutputHandlers<CO, S, O>,
  fallback?: (output: CO) => Action<S, O>,
): (output: CO) => Action<S, O> {
  return (output: CO): Action<S, O> => {
    const outputType = output.type as CO['type'];
    const handler = handlers[outputType] as ((value: CO) => Action<S, O>) | undefined;

    if (handler !== undefined) {
      return handler(output);
    }

    if (fallback !== undefined) {
      return fallback(output);
    }

    throw new Error(`No child output handler registered for type "${output.type}"`);
  };
}
