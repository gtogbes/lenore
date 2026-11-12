// Minimal ambient types so `tsc -p tsconfig.core.json` works without @types/node
// (the sandbox cannot install packages). Only used by tsconfig.core.json.
declare module "node:test" {
  type TestFn = () => void | Promise<void>;
  interface TestOptions {
    skip?: boolean | string;
  }
  export function test(name: string, fn: TestFn): Promise<void>;
  export function test(name: string, options: TestOptions, fn: TestFn): Promise<void>;
}

declare module "node:assert/strict" {
  const assert: {
    (value: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
  };
  export default assert;
}

declare module "fast-check";
