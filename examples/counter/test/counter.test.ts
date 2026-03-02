import { createRuntime } from '@workflow-ts/core';
import { describe, expect, it } from 'vitest';

import { counterWorkflow } from '../src/workflow';

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
    const outputs: unknown[] = [];
    const runtime = createRuntime(counterWorkflow, undefined, (o) => outputs.push(o));
    
    runtime.getRendering().increment();
    expect(outputs).toHaveLength(0);
    
    runtime.getRendering().decrement();
    expect(outputs).toEqual([{ type: 'reachedZero' }]);
    
    runtime.dispose();
  });
});
