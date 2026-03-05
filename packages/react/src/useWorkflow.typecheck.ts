import type { AllowedProp } from './useWorkflow';

type AssertTrue<T extends true> = T;
type AssertFalse<T extends false> = T;

export type UseWorkflowTypeChecks = [
  AssertTrue<string extends AllowedProp ? true : false>,
  AssertTrue<readonly number[] extends AllowedProp ? true : false>,
  AssertTrue<Date extends AllowedProp ? true : false>,
  AssertTrue<Map<string, number> extends AllowedProp ? true : false>,
  AssertTrue<Set<number> extends AllowedProp ? true : false>,
  AssertTrue<Uint8Array extends AllowedProp ? true : false>,
  AssertFalse<Promise<number> extends AllowedProp ? true : false>,
  AssertFalse<WeakMap<object, object> extends AllowedProp ? true : false>,
  AssertFalse<WeakSet<object> extends AllowedProp ? true : false>,
];
