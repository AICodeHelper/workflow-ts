import { useWorkflow } from '@workflow-ts/react';
import { counterWorkflow, type Output } from './workflow';

export function Counter() {
  const { count, isZero, isMax, increment, decrement, reset } = useWorkflow(
    counterWorkflow,
    undefined,
    (output: Output) => {
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
