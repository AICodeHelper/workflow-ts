import type { Workflow } from '@workflow-ts/core';
import { createRuntime, WorkflowRuntime } from '@workflow-ts/core';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

type RuntimeLifecycleMode = 'always-on' | 'pause-when-backgrounded';

const isObjectLike = (value: unknown): value is Record<string | symbol, unknown> => {
  return typeof value === 'object' && value !== null;
};

interface PropsSnapshot {
  readonly cloned: unknown;
}

const deepClone = (value: unknown, seen = new WeakMap<object, unknown>()): unknown => {
  if (!isObjectLike(value)) return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof WeakMap || value instanceof WeakSet || value instanceof Promise) return value;

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (Array.isArray(value)) {
    const clone: unknown[] = [];
    seen.set(value, clone);
    for (const item of value) {
      clone.push(deepClone(item, seen));
    }
    return clone;
  }

  if (value instanceof Map) {
    const clone = new Map<unknown, unknown>();
    seen.set(value, clone);
    for (const [key, mapValue] of value.entries()) {
      clone.set(deepClone(key, seen), deepClone(mapValue, seen));
    }
    return clone;
  }

  if (value instanceof Set) {
    const clone = new Set<unknown>();
    seen.set(value, clone);
    for (const setValue of value.values()) {
      clone.add(deepClone(setValue, seen));
    }
    return clone;
  }

  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      const cloneBuffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      return new DataView(cloneBuffer);
    }
    return new (value.constructor as new (input: ArrayBufferView) => unknown)(value);
  }

  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }

  const prototype = Object.getPrototypeOf(value) as object | null;
  const clone = Object.create(prototype) as Record<string | symbol, unknown>;
  seen.set(value, clone);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if ('value' in descriptor) {
      descriptor.value = deepClone(descriptor.value, seen);
    }
    Object.defineProperty(clone, key, descriptor);
  }

  return clone;
};

const deepEqual = (a: unknown, b: unknown, seen = new WeakMap<object, object>()): boolean => {
  if (Object.is(a, b)) return true;
  if (!isObjectLike(a) || !isObjectLike(b)) return false;
  if (a instanceof WeakMap || b instanceof WeakMap || a instanceof WeakSet || b instanceof WeakSet) {
    return false;
  }

  const seenTarget = seen.get(a);
  if (seenTarget !== undefined) {
    return seenTarget === b;
  }
  seen.set(a, b);

  if (a instanceof Date || b instanceof Date) {
    if (!(a instanceof Date) || !(b instanceof Date)) return false;
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp || b instanceof RegExp) {
    if (!(a instanceof RegExp) || !(b instanceof RegExp)) return false;
    return a.source === b.source && a.flags === b.flags;
  }

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map)) return false;
    if (a.size !== b.size) return false;

    const bEntries = [...b.entries()];
    let index = 0;
    for (const [aKey, aValue] of a.entries()) {
      const [bKey, bValue] = bEntries[index] ?? [];
      if (!deepEqual(aKey, bKey, seen)) return false;
      if (!deepEqual(aValue, bValue, seen)) return false;
      index += 1;
    }
    return true;
  }

  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set)) return false;
    if (a.size !== b.size) return false;

    const bValues = [...b.values()];
    let index = 0;
    for (const aValue of a.values()) {
      const bValue = bValues[index];
      if (!deepEqual(aValue, bValue, seen)) return false;
      index += 1;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i], seen)) return false;
    }
    return true;
  }

  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    if (!ArrayBuffer.isView(a) || !ArrayBuffer.isView(b)) return false;
    if (a.constructor !== b.constructor || a.byteLength !== b.byteLength) return false;
    const aBytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const bBytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    for (let i = 0; i < aBytes.length; i += 1) {
      if (aBytes[i] !== bBytes[i]) return false;
    }
    return true;
  }

  if (a instanceof ArrayBuffer || b instanceof ArrayBuffer) {
    if (!(a instanceof ArrayBuffer) || !(b instanceof ArrayBuffer)) return false;
    if (a.byteLength !== b.byteLength) return false;
    const aBytes = new Uint8Array(a);
    const bBytes = new Uint8Array(b);
    for (let i = 0; i < aBytes.length; i += 1) {
      if (aBytes[i] !== bBytes[i]) return false;
    }
    return true;
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  const aKeys = Reflect.ownKeys(a);
  const bKeys = Reflect.ownKeys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key], seen)) return false;
  }

  return true;
};

const createPropsSnapshot = (props: unknown): PropsSnapshot => ({
  cloned: deepClone(props),
});

const propsChanged = (snapshot: PropsSnapshot, nextProps: unknown): boolean => {
  return !deepEqual(snapshot.cloned, nextProps);
};

/**
 * Hook to use a workflow in a React component.
 *
 * @param workflow - The workflow definition
 * @param props - Props to pass to the workflow
 * @param onOutput - Optional callback for workflow outputs
 * @returns The current rendering
 *
 * @example
 * ```tsx
 * const counter = useWorkflow(counterWorkflow, undefined);
 * return (
 *   <div>
 *     <span>{counter.count}</span>
 *     <button onClick={counter.onIncrement}>+</button>
 *     <button onClick={counter.onDecrement}>-</button>
 *   </div>
 * );
 * ```
 */
export interface UseWorkflowHookOptions<O> {
  /** Reset runtime when workflow identity changes (opt-in) */
  resetOnWorkflowChange?: boolean;
  /** Runtime lifecycle mode */
  lifecycle?: RuntimeLifecycleMode;
  /** Whether runtime should be active (used with pause-when-backgrounded lifecycle) */
  isActive?: boolean;
  /** Optional handlers for specific output types */
  outputHandlers?: {
    [K in O extends { type: string } ? O['type'] : never]?: (output: Extract<O, { type: K }>) => void;
  };
}

export function useWorkflow<P, S, O, R>(
  workflow: Workflow<P, S, O, R>,
  props: P,
  onOutput?: (output: O) => void,
  options?: UseWorkflowHookOptions<O>,
): R {
  const onOutputRef = useRef(onOutput);
  onOutputRef.current = onOutput;
  const lastRenderingRef = useRef<R | null>(null);
  const lastSyncedPropsRef = useRef<PropsSnapshot>(createPropsSnapshot(props));

  const runtimeRef = useRef<WorkflowRuntime<P, S, O, R> | null>(null);
  const pendingDisposalsRef = useRef(new Map<WorkflowRuntime<P, S, O, R>, ReturnType<typeof setTimeout>>());
  const workflowRef = useRef(workflow);
  const lifecycle = options?.lifecycle ?? 'always-on';
  const shouldBeActive = lifecycle === 'pause-when-backgrounded' ? options?.isActive ?? true : true;
  const previousActiveRef = useRef(shouldBeActive);
  const workflowChanged = workflowRef.current !== workflow;
  const shouldCreateRuntime = shouldBeActive || (runtimeRef.current === null && lastRenderingRef.current === null);

  // Create a new runtime when needed:
  // 1. First render
  // 2. Previous runtime was disposed (e.g. StrictMode effect replay)
  // 3. Workflow identity changed and resetOnWorkflowChange is enabled
  const needsNewRuntime =
    shouldCreateRuntime &&
    (
      runtimeRef.current === null ||
      runtimeRef.current.isDisposed() ||
      (options?.resetOnWorkflowChange === true && workflowChanged)
    );

  if (needsNewRuntime) {
    const propsSnapshot = createPropsSnapshot(props);
    runtimeRef.current = createRuntime(workflow, propsSnapshot.cloned as P, {
      onOutput: (output: O) => {
        onOutputRef.current?.(output);
      },
    });
    lastSyncedPropsRef.current = propsSnapshot;
  }
  workflowRef.current = workflow;

  const runtime = runtimeRef.current;
  const scheduleDispose = useCallback((runtimeToDispose: WorkflowRuntime<P, S, O, R>) => {
    if (runtimeToDispose.isDisposed()) return;
    if (pendingDisposalsRef.current.has(runtimeToDispose)) return;

    const timerId = setTimeout(() => {
      pendingDisposalsRef.current.delete(runtimeToDispose);
      if (!runtimeToDispose.isDisposed()) {
        runtimeToDispose.dispose();
      }
      if (runtimeRef.current === runtimeToDispose) {
        runtimeRef.current = null;
      }
    }, 0);

    pendingDisposalsRef.current.set(runtimeToDispose, timerId);
  }, []);
  const cancelPendingDispose = useCallback((runtimeToKeep: WorkflowRuntime<P, S, O, R>) => {
    const timerId = pendingDisposalsRef.current.get(runtimeToKeep);
    if (timerId === undefined) return;
    clearTimeout(timerId);
    pendingDisposalsRef.current.delete(runtimeToKeep);
  }, []);

  // Register typed output handlers with proper cleanup
  useEffect(() => {
    if (runtime === null || runtime.isDisposed() || !shouldBeActive) return;

    const handlers = options?.outputHandlers;
    if (!handlers) return;

    const unsubscribes: (() => void)[] = [];

    // Object.entries loses type correlation between key and handler, so we cast.
    // When K is inferred as the full OutputType union, Extract<O, { type: OutputType }>
    // resolves to all of O — every handler appears to accept all variants. This is
    // unavoidable with Object.entries but safe: outputHandlers is typed to only allow
    // valid pairs, and runtime.on only calls each handler with its matching output type.
    type OutputType = O extends { type: string } ? O['type'] : never;
    for (const [type, handler] of Object.entries(handlers)) {
      if (handler !== undefined) {
        const unsubscribe = runtime.on(
          type as OutputType,
          handler as (output: Extract<O, { type: OutputType }>) => void
        );
        unsubscribes.push(unsubscribe);
      }
    }

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [runtime, options?.outputHandlers, shouldBeActive]);

  // Dispose this runtime when it is replaced or the component unmounts.
  useEffect(() => {
    if (runtime === null) {
      previousActiveRef.current = shouldBeActive;
      return;
    }

    const wasActive = previousActiveRef.current;
    previousActiveRef.current = shouldBeActive;
    const transitionedToInactive = wasActive && !shouldBeActive;

    if (transitionedToInactive) {
      cancelPendingDispose(runtime);
      if (!runtime.isDisposed()) {
        lastRenderingRef.current = runtime.getRendering();
        runtime.dispose();
      }
      if (runtimeRef.current === runtime) {
        runtimeRef.current = null;
      }
      return;
    }

    if (shouldBeActive) {
      // StrictMode effect replay cleanup schedules disposal. Setup for the same runtime
      // immediately cancels that pending disposal.
      cancelPendingDispose(runtime);
    } else {
      if (!runtime.isDisposed()) {
        lastRenderingRef.current = runtime.getRendering();
      }
      scheduleDispose(runtime);
    }

    return () => {
      // If this effect is cleaning up a runtime that has already been replaced,
      // dispose immediately to avoid one-tick stale runtime activity.
      if (runtimeRef.current !== runtime) {
        cancelPendingDispose(runtime);
        if (!runtime.isDisposed()) {
          runtime.dispose();
        }
        return;
      }
      scheduleDispose(runtime);
    };
  }, [runtime, shouldBeActive, scheduleDispose, cancelPendingDispose]);

  // Intentionally run after every render so deep prop mutations are detected
  // even when React reference equality says props are unchanged.
  useEffect(() => {
    if (runtime === null || runtime.isDisposed() || !shouldBeActive) return;
    if (!propsChanged(lastSyncedPropsRef.current, props)) return;
    const propsSnapshot = createPropsSnapshot(props);
    lastSyncedPropsRef.current = propsSnapshot;
    runtime.updateProps(propsSnapshot.cloned as P);
  });

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!shouldBeActive || runtime === null || runtime.isDisposed()) {
        return () => undefined;
      }
      return runtime.subscribe(listener);
    },
    [runtime, shouldBeActive]
  );
  const getRenderingSnapshot = useCallback(() => {
    if (shouldBeActive) {
      if (runtime === null || runtime.isDisposed()) {
        throw new Error('Workflow runtime is not available');
      }
      const rendering = runtime.getRendering();
      lastRenderingRef.current = rendering;
      return rendering;
    }

    if (runtime !== null && !runtime.isDisposed()) {
      const rendering = runtime.getRendering();
      lastRenderingRef.current = rendering;
      return rendering;
    }

    if (lastRenderingRef.current !== null) {
      return lastRenderingRef.current;
    }

    throw new Error('Workflow rendering is not available while inactive');
  }, [runtime, shouldBeActive]);

  // Subscribe to rendering changes
  return useSyncExternalStore(subscribe, getRenderingSnapshot, getRenderingSnapshot);
}

/**
 * Hook options for useWorkflowWithState
 */
export interface UseWorkflowOptions<P, O> {
  /** Initial props for the workflow */
  props: P;
  /** Callback for workflow outputs */
  onOutput?: (output: O) => void;
  /** Runtime lifecycle mode */
  lifecycle?: RuntimeLifecycleMode;
  /** Whether runtime should be active (used with pause-when-backgrounded lifecycle) */
  isActive?: boolean;
  /** Optional handlers for specific output types */
  outputHandlers?: {
    [K in O extends { type: string } ? O['type'] : never]?: (output: Extract<O, { type: K }>) => void;
  };
  /** Reset runtime when workflow identity changes (opt-in) */
  resetOnWorkflowChange?: boolean;
}

/**
 * Hook result that includes both rendering and runtime controls
 */
export interface UseWorkflowResult<P, S, R> {
  /** Current rendering */
  rendering: R;
  /** Current state (for debugging) */
  state: S;
  /** Current props */
  props: P;
  /** Update props */
  updateProps: (props: P) => void;
  /** Snapshot current state */
  snapshot: () => string | undefined;
}

/**
 * Hook that returns both rendering and runtime controls.
 *
 * @param workflow - The workflow definition
 * @param options - Hook options
 * @returns Rendering and runtime controls
 *
 * @example
 * ```tsx
 * const { rendering, state, updateProps } = useWorkflowWithState(
 *   searchWorkflow,
 *   { props: { query: '' } }
 * );
 *
 * return (
 *   <div>
 *     <input onChange={(e) => updateProps({ query: e.target.value })} />
 *     <ul>{rendering.results.map(r => <li key={r.id}>{r.name}</li>)}</ul>
 *   </div>
 * );
 * ```
 */
export function useWorkflowWithState<P, S, O, R>(
  workflow: Workflow<P, S, O, R>,
  options: UseWorkflowOptions<P, O>,
): UseWorkflowResult<P, S, R> {
  const onOutputRef = useRef(options.onOutput);
  onOutputRef.current = options.onOutput;
  const lastSyncedExternalPropsRef = useRef<PropsSnapshot>(createPropsSnapshot(options.props));

  const runtimeRef = useRef<WorkflowRuntime<P, S, O, R> | null>(null);
  const pendingDisposalsRef = useRef(new Map<WorkflowRuntime<P, S, O, R>, ReturnType<typeof setTimeout>>());
  const workflowRef = useRef(workflow);
  const lifecycle = options.lifecycle ?? 'always-on';
  const shouldBeActive = lifecycle === 'pause-when-backgrounded' ? options.isActive ?? true : true;
  const shouldBeActiveRef = useRef(shouldBeActive);
  shouldBeActiveRef.current = shouldBeActive;
  const previousActiveRef = useRef(shouldBeActive);
  const workflowChanged = workflowRef.current !== workflow;
  const lastSnapshotRef = useRef<UseWorkflowResult<P, S, R> | null>(null);
  const lastSnapshotStringRef = useRef<string | undefined>(undefined);
  const shouldCreateRuntime = shouldBeActive || (runtimeRef.current === null && lastSnapshotRef.current === null);

  // Create a new runtime when needed:
  // 1. First render
  // 2. Previous runtime was disposed (e.g. StrictMode effect replay)
  // 3. Workflow identity changed and resetOnWorkflowChange is enabled
  const needsNewRuntime =
    shouldCreateRuntime &&
    (
      runtimeRef.current === null ||
      runtimeRef.current.isDisposed() ||
      (options.resetOnWorkflowChange === true && workflowChanged)
    );

  if (needsNewRuntime) {
    const propsSnapshot = createPropsSnapshot(options.props);
    runtimeRef.current = createRuntime(workflow, propsSnapshot.cloned as P, {
      onOutput: (output: O) => {
        onOutputRef.current?.(output);
      },
    });
    lastSyncedExternalPropsRef.current = propsSnapshot;
  }
  workflowRef.current = workflow;

  const runtime = runtimeRef.current;
  const scheduleDispose = useCallback((runtimeToDispose: WorkflowRuntime<P, S, O, R>) => {
    if (runtimeToDispose.isDisposed()) return;
    if (pendingDisposalsRef.current.has(runtimeToDispose)) return;

    const timerId = setTimeout(() => {
      pendingDisposalsRef.current.delete(runtimeToDispose);
      if (!runtimeToDispose.isDisposed()) {
        runtimeToDispose.dispose();
      }
      if (runtimeRef.current === runtimeToDispose) {
        runtimeRef.current = null;
      }
    }, 0);

    pendingDisposalsRef.current.set(runtimeToDispose, timerId);
  }, []);
  const cancelPendingDispose = useCallback((runtimeToKeep: WorkflowRuntime<P, S, O, R>) => {
    const timerId = pendingDisposalsRef.current.get(runtimeToKeep);
    if (timerId === undefined) return;
    clearTimeout(timerId);
    pendingDisposalsRef.current.delete(runtimeToKeep);
  }, []);
  const safeUpdateProps = useCallback((nextProps: P): void => {
    if (!shouldBeActiveRef.current) return;
    const currentRuntime = runtimeRef.current;
    if (currentRuntime === null || currentRuntime.isDisposed()) return;
    currentRuntime.updateProps(deepClone(nextProps) as P);
  }, []);
  const safeSnapshot = useCallback((): string | undefined => {
    const currentRuntime = runtimeRef.current;
    if (currentRuntime !== null && !currentRuntime.isDisposed()) {
      const snapshotValue = currentRuntime.snapshot();
      lastSnapshotStringRef.current = snapshotValue;
      return snapshotValue;
    }
    return lastSnapshotStringRef.current;
  }, []);
  const createResultSnapshot = useCallback(
    (rendering: R, state: S, props: P): UseWorkflowResult<P, S, R> => ({
      rendering,
      state,
      props,
      updateProps: safeUpdateProps,
      snapshot: safeSnapshot,
    }),
    [safeUpdateProps, safeSnapshot],
  );

  // Register typed output handlers with proper cleanup
  useEffect(() => {
    if (runtime === null || runtime.isDisposed() || !shouldBeActive) return;

    const handlers = options.outputHandlers;
    if (!handlers) return;

    const unsubscribes: (() => void)[] = [];

    // Object.entries loses type correlation between key and handler, so we cast.
    // When K is inferred as the full OutputType union, Extract<O, { type: OutputType }>
    // resolves to all of O — every handler appears to accept all variants. This is
    // unavoidable with Object.entries but safe: outputHandlers is typed to only allow
    // valid pairs, and runtime.on only calls each handler with its matching output type.
    type OutputType = O extends { type: string } ? O['type'] : never;
    for (const [type, handler] of Object.entries(handlers)) {
      if (handler !== undefined) {
        const unsubscribe = runtime.on(
          type as OutputType,
          handler as (output: Extract<O, { type: OutputType }>) => void
        );
        unsubscribes.push(unsubscribe);
      }
    }

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [runtime, options.outputHandlers, shouldBeActive]);

  // Dispose this runtime when it is replaced or the component unmounts.
  useEffect(() => {
    if (runtime === null) {
      previousActiveRef.current = shouldBeActive;
      return;
    }

    const wasActive = previousActiveRef.current;
    previousActiveRef.current = shouldBeActive;
    const transitionedToInactive = wasActive && !shouldBeActive;

    if (transitionedToInactive) {
      cancelPendingDispose(runtime);
      if (!runtime.isDisposed()) {
        const rendering = runtime.getRendering();
        const state = runtime.getState();
        const props = runtime.getProps();
        lastSnapshotRef.current = createResultSnapshot(rendering, state, props);
        lastSnapshotStringRef.current = runtime.snapshot();
        runtime.dispose();
      }
      if (runtimeRef.current === runtime) {
        runtimeRef.current = null;
      }
      return;
    }

    if (shouldBeActive) {
      // StrictMode effect replay cleanup schedules disposal. Setup for the same runtime
      // immediately cancels that pending disposal.
      cancelPendingDispose(runtime);
    } else {
      if (!runtime.isDisposed()) {
        const rendering = runtime.getRendering();
        const state = runtime.getState();
        const props = runtime.getProps();
        lastSnapshotRef.current = createResultSnapshot(rendering, state, props);
        lastSnapshotStringRef.current = runtime.snapshot();
      }
      scheduleDispose(runtime);
    }

    return () => {
      // If this effect is cleaning up a runtime that has already been replaced,
      // dispose immediately to avoid one-tick stale runtime activity.
      if (runtimeRef.current !== runtime) {
        cancelPendingDispose(runtime);
        if (!runtime.isDisposed()) {
          runtime.dispose();
        }
        return;
      }
      scheduleDispose(runtime);
    };
  }, [runtime, shouldBeActive, scheduleDispose, cancelPendingDispose, createResultSnapshot]);

  // Intentionally run after every render so deep prop mutations are detected
  // even when React reference equality says props are unchanged.
  useEffect(() => {
    if (runtime === null || runtime.isDisposed() || !shouldBeActive) return;
    if (!propsChanged(lastSyncedExternalPropsRef.current, options.props)) return;
    const propsSnapshot = createPropsSnapshot(options.props);
    lastSyncedExternalPropsRef.current = propsSnapshot;
    runtime.updateProps(propsSnapshot.cloned as P);
  });

  useEffect(() => {
    if (runtime !== null && !runtime.isDisposed()) {
      lastSnapshotRef.current = null;
    }
  }, [runtime]);

  const getSnapshot = useCallback(() => {
    if (!shouldBeActive) {
      if (runtime !== null && !runtime.isDisposed()) {
        const rendering = runtime.getRendering();
        const state = runtime.getState();
        const props = runtime.getProps();
        if (lastSnapshotRef.current !== null) {
          if (
            lastSnapshotRef.current.rendering === rendering &&
            lastSnapshotRef.current.state === state &&
            lastSnapshotRef.current.props === props
          ) {
            return lastSnapshotRef.current;
          }
        }
        const inactiveSnapshot = createResultSnapshot(rendering, state, props);
        lastSnapshotRef.current = inactiveSnapshot;
        lastSnapshotStringRef.current = runtime.snapshot();
        return inactiveSnapshot;
      }

      if (lastSnapshotRef.current !== null) {
        return lastSnapshotRef.current;
      }

      throw new Error('Workflow snapshot is not available while inactive');
    }

    if (runtime === null || runtime.isDisposed()) {
      throw new Error('Workflow runtime is not available');
    }

    const rendering = runtime.getRendering();
    const state = runtime.getState();
    const props = runtime.getProps();

    if (lastSnapshotRef.current !== null) {
      if (
        lastSnapshotRef.current.rendering === rendering &&
        lastSnapshotRef.current.state === state &&
        lastSnapshotRef.current.props === props
      ) {
        return lastSnapshotRef.current;
      }
    }

    lastSnapshotRef.current = createResultSnapshot(rendering, state, props);

    return lastSnapshotRef.current;
  }, [runtime, shouldBeActive, createResultSnapshot]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!shouldBeActive || runtime === null || runtime.isDisposed()) {
        return () => undefined;
      }
      return runtime.subscribe(listener);
    },
    [runtime, shouldBeActive]
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return snapshot;
}
