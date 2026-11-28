import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

// Exercise the real privacy/cache/source-binding tests through the existing unit
// runner, so local pre-push and CI cover this tool without any workflow change.
it('runs the private development collector safety regressions', () => {
  const result = spawnSync('python3', [
    '-m', 'unittest', 'discover', '-s', 'scripts/dev', '-p', 'test_collect_iteration.py',
  ], { cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8', timeout: 30_000 })
  expect(result.error).toBeUndefined()
  expect(result.status, result.stderr).toBe(0)
})
