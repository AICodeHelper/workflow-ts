import { describe, expect, it } from 'vitest';

import { createRuntime, createStatefulWorkflow, type Workflow } from '../src';

interface Props {
  readonly start: number;
}

interface State {
  readonly count: number;
}

interface Output {
  readonly type: 'threshold';
  readonly count: number;
}

interface Rendering {
  readonly count: number;
  readonly increment: () => void;
}

describe('createStatefulWorkflow', () => {
  it('creates workflow with inferred types', () => {
    const workflow = createStatefulWorkflow<Props, State, Output, Rendering>({
      initialState: (props) => ({ count: props.start }),
      render: (_props, state, ctx) => ({
        count: state.count,
        increment: () => {
          ctx.actionSink.send((s) => {
            const next = s.count + 1;
            return {
              state: { count: next },
              ...(next >= 3 ? { output: { type: 'threshold' as const, count: next } } : {}),
            };
          });
        },
      }),
      snapshot: (state) => JSON.stringify(state),
      restore: (snapshot) => JSON.parse(snapshot) as State,
    });

    const outputs: Output[] = [];
    const runtime = createRuntime(workflow, { start: 1 }, (output) => {
      outputs.push(output);
    });

    runtime.getRendering().increment();
    runtime.getRendering().increment();

    expect(runtime.getState()).toEqual({ count: 3 });
    expect(outputs).toEqual([{ type: 'threshold', count: 3 }]);
    expect(runtime.snapshot()).toBe('{"count":3}');

    runtime.dispose();
  });

  it('is equivalent to object-literal workflow behavior', () => {
    const built = createStatefulWorkflow<Props, State, never, { count: number }>({
      initialState: (props) => ({ count: props.start }),
      render: (_props, state) => ({ count: state.count }),
    });

    const literal: Workflow<Props, State, never, { count: number }> = {
      initialState: (props) => ({ count: props.start }),
      render: (_props, state) => ({ count: state.count }),
    };

    const builtRuntime = createRuntime(built, { start: 5 });
    const literalRuntime = createRuntime(literal, { start: 5 });

    expect(builtRuntime.getRendering()).toEqual(literalRuntime.getRendering());

    builtRuntime.dispose();
    literalRuntime.dispose();
  });
});
