import { type Workflow, action } from '@workflow-ts/core';

// Define state
export interface State {
  count: number;
}

// Define rendering (what the UI sees)
export interface Rendering {
  count: number;
  isZero: boolean;
  isMax: boolean;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// Define outputs (events to parent)
export type Output = 
  | { type: 'reachedZero' }
  | { type: 'reachedMax'; value: number };

const MAX_COUNT = 10;

export const counterWorkflow: Workflow<void, State, Output, Rendering> = {
  initialState: () => ({ count: 0 }),
  
  render: (_props, state, ctx) => ({
    count: state.count,
    isZero: state.count === 0,
    isMax: state.count === MAX_COUNT,
    
    increment: () => {
      ctx.actionSink.send((s) => {
        const newCount = Math.min(s.count + 1, MAX_COUNT);
        return {
          state: { count: newCount },
          ...(newCount === MAX_COUNT ? { output: { type: 'reachedMax', value: newCount } as Output } : {}),
        };
      });
    },
    
    decrement: () => {
      ctx.actionSink.send((s) => {
        const newCount = Math.max(s.count - 1, 0);
        return {
          state: { count: newCount },
          ...(newCount === 0 ? { output: { type: 'reachedZero' } as Output } : {}),
        };
      });
    },
    
    reset: () => {
      ctx.actionSink.send(action(() => ({ count: 0 })));
    },
  }),
};
