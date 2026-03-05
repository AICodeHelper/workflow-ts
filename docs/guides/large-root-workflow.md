# Large Root Workflow Pattern

For complex flows (checkout, onboarding, account recovery), structure the root workflow as an explicit state machine that orchestrates child workflows and workers.

## Why this pattern

- Keeps orchestration logic in one place.
- Makes state transitions explicit and testable.
- Lets child workflows stay focused on feature-local behavior.

## Recommended structure

1. Define a discriminated union for root state.
2. Define root rendering as a union of child renderings (plus loading/placeholder states).
3. Keep root output as a narrow set of parent-facing events.
4. Use stable child keys when rendering children.
5. Trigger workers from `render()` only in states that need them.

### Minimal skeleton

```ts
import { createStatefulWorkflow, safeAction, type Workflow } from '@workflow-ts/core';

type Props = { flowId: string };
type Output = { type: 'done' } | { type: 'cancelled' };
type State =
  | { type: 'loading' }
  | { type: 'ready'; data: { id: string } }
  | { type: 'error'; message: string };
type Rendering =
  | { type: 'loading' }
  | { type: 'ready'; title: string; retry: () => void }
  | { type: 'error'; message: string; retry: () => void };

export const rootWorkflow: Workflow<Props, State, Output, Rendering> =
  createStatefulWorkflow({
    initialState: () => ({ type: 'loading' }),
    render: (_props, state, ctx) => {
      if (state.type === 'loading') {
        // ctx.runWorker(...)
      }

      switch (state.type) {
        case 'loading':
          return { type: 'loading' };
        case 'ready':
          return {
            type: 'ready',
            title: state.data.id,
            retry: () => ctx.actionSink.send(safeAction<State, Output, 'ready'>('ready', (s) => ({ state: s }))),
          };
        case 'error':
          return {
            type: 'error',
            message: state.message,
            retry: () => ctx.actionSink.send(() => ({ state: { type: 'loading' } })),
          };
      }
    },
  });
```

## Key APIs

- `createStatefulWorkflow(...)` for ergonomic workflow construction.
- `safeAction(...)` for state-guarded reducers.
- `ctx.renderChild(...)` for child composition.
- `ctx.runWorker(...)` for async side effects.
- `matchResult(...)` for success/error branching.

## Example mapping from Kotlin

- `StatefulWorkflow<Props, State, Output, Rendering>` -> `Workflow<P, S, O, R>` (or `createStatefulWorkflow(...)`).
- `renderChild(child, props, key) { output -> ... }` -> `ctx.renderChild(child, props, key, (output) => action)`.
- `runningWorker(worker, key, handler)` -> `ctx.runWorker(worker, key, handler)`.
- `safeAction<State>(...)` -> `safeAction(expectedType, reducer)`.

## Practical guidance

- Keep root states coarse and meaningful (`loading`, `loaded`, `fallback`, `expired`).
- Keep child props minimal and immutable.
- Prefer explicit transitions over implicit mutable flags.
- Treat outputs as navigation/domain events, not internal details.
- Reuse worker keys to preserve in-flight work across renders.

## Suggested testing strategy

1. Verify each root state renders the expected child or placeholder.
2. Verify child outputs map to correct root transitions/outputs.
3. Verify worker completion drives correct transitions.
4. Verify error and edge paths (expired activity, fallback states, reload loops).
