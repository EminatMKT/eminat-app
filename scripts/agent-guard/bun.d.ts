// The one `bun:test` export the guard checks use, typed here so the checks typecheck without
// adding the bun-types package; the runtime is the repo-local bun devDependency.
declare module 'bun:test' {
  export function test(name: string, run: () => void): void
}
