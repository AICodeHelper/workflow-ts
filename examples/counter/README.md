# Counter Example

A simple counter demonstrating state, actions, and rendering.

## Running

```bash
cd examples/counter
pnpm install
pnpm dev
```

## Code

### workflow.ts

```typescript
import { type Workflow, action } from '@workflow-ts/core';

// Define state
interface State {
  count: number;
}

// Define rendering (what the UI sees)
interface Rendering {
  count: number;
  isZero: boolean;
  isMax: boolean;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// Define outputs (events to parent)
type Output = 
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
          ...(newCount === MAX_COUNT && { output: { type: 'reachedMax', value: newCount } }),
        };
      });
    },
    
    decrement: () => {
      ctx.actionSink.send((s) => {
        const newCount = Math.max(s.count - 1, 0);
        return {
          state: { count: newCount },
          ...(newCount === 0 && { output: { type: 'reachedZero' } }),
        };
      });
    },
    
    reset: () => {
      ctx.actionSink.send(action(() => ({ count: 0 })));
    },
  }),
};
```

### Counter.tsx

```tsx
import { useWorkflow } from '@workflow-ts/react';
import { counterWorkflow } from './workflow';

export function Counter() {
  const { count, isZero, isMax, increment, decrement, reset } = useWorkflow(
    counterWorkflow,
    undefined,
    (output) => {
      if (output.type === 'reachedZero') {
        console.log('Counter reset to zero!');
      } else if (output.type === 'reachedMax') {
        console.log(`Reached maximum: ${output.value}`);
      }
    }
  );
  
  return (
    <div className="counter">
      <h2>Count: {count}</h2>
      
      <div className="buttons">
        <button onClick={decrement} disabled={isZero}>
          −
        </button>
        
        <button onClick={increment} disabled={isMax}>
          +
        </button>
        
        <button onClick={reset} disabled={isZero}>
          Reset
        </button>
      </div>
      
      {isMax && <p className="warning">Maximum reached!</p>}
    </div>
  );
}
```

### counter.test.ts

```typescript
import { describe, expect, it } from 'vitest';
import { createRuntime } from '@workflow-ts/core';
import { counterWorkflow } from './workflow';

describe('Counter Workflow', () => {
  it('starts at zero', () => {
    const runtime = createRuntime(counterWorkflow, undefined);
    expect(runtime.getState().count).toBe(0);
    expect(runtime.getRendering().isZero).toBe(true);
    runtime.dispose();
  });
  
  it('increments up to max', () => {
    const runtime = createRuntime(counterWorkflow, undefined);
    
    for (let i = 0; i < 15; i++) {
      runtime.getRendering().increment();
    }
    
    expect(runtime.getState().count).toBe(10);
    expect(runtime.getRendering().isMax).toBe(true);
    runtime.dispose();
  });
  
  it('emits output at boundaries', () => {
    const outputs: any[] = [];
    const runtime = createRuntime(counterWorkflow, undefined, (o) => outputs.push(o));
    
    runtime.getRendering().increment();
    expect(outputs).toHaveLength(0);
    
    runtime.getRendering().decrement();
    expect(outputs).toEqual([{ type: 'reachedZero' }]);
    
    runtime.dispose();
  });
});
```
