import type { Action } from './types';

export type Result<T, E> =
  | {
      readonly type: 'success';
      readonly data: T;
    }
  | {
      readonly type: 'error';
      readonly error: E;
    };

export interface ResultHandlers<T, E, S, O> {
  readonly success: (data: T) => Action<S, O>;
  readonly error: (error: E) => Action<S, O>;
}

/**
 * Route a standard `{ type: 'success' | 'error' }` result to typed action factories.
 */
export function matchResult<T, E, S, O>(
  result: Result<T, E>,
  handlers: ResultHandlers<T, E, S, O>,
): Action<S, O> {
  if (result.type === 'success') {
    return handlers.success(result.data);
  }

  return handlers.error(result.error);
}
