import { useWorkflow } from '@workflow-ts/react';

import { counterWorkflow, type Output } from './workflow';

export function Counter(): JSX.Element {
  const { count, isZero, isMax, increment, decrement, reset } = useWorkflow(
    counterWorkflow,
    undefined,
    (output: Output) => {
      if (output.type === 'reachedZero') {
        // Counter reset to zero - could emit event here
      } else {
        // Reached maximum - could emit event here
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
