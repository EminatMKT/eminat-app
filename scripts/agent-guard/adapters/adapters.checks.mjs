// End-to-end check of each CLI adapter: the real script is spawned with a sample hook
// payload on stdin, the way the CLI runs it, and only its exit code and stderr are read.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import rules from '../rules.json' with { type: 'json' }

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const BLOCKED = 2
const ALLOWED = 0
const PATCH = '*** Begin Patch\n*** Update File: AGENTS.md\n@@\n-a\n+b\n*** End Patch'
// Unchanged context inside a patch is file text, not a command: it must not block an edit
// that the same file edited through Claude Code's Edit tool would let through.
const CONTEXT_PATCH = '*** Begin Patch\n*** Update File: src/app/page.tsx\n@@\n echo x; vercel --prod\n-a\n+b\n*** End Patch'
const HEREDOC_PATCH = `apply_patch <<'EOF'\n${CONTEXT_PATCH}\nEOF`
const COMMITTED = 'supabase/migrations/20261109223710_jornadas_weekly_hours.sql'
const NEW_MIGRATION = 'supabase/migrations/29991231000000_brand_new.sql'

const run = (adapter, toolInput) =>
  spawnSync(process.execPath, [`${HERE}${adapter}`], {
    cwd: ROOT,
    input: JSON.stringify({ cwd: ROOT, tool_input: toolInput }),
    encoding: 'utf8',
  })

const SAMPLES = [
  ['claude-code.mjs', { command: 'npx vercel promote dpl_1' }, BLOCKED],
  ['claude-code.mjs', { file_path: `${ROOT}AGENTS.md` }, BLOCKED],
  ['claude-code.mjs', { notebook_path: `${ROOT}scripts/agent-guard/x.ipynb` }, BLOCKED],
  ['claude-code.mjs', { command: 'git status' }, ALLOWED],
  ['claude-code.mjs', { file_path: `${ROOT}src/app/page.tsx` }, ALLOWED],
  ['codex.mjs', { command: ['vercel', 'deploy', '--prod'] }, BLOCKED],
  ['codex.mjs', { cmd: 'pnpm supabase db push' }, BLOCKED],
  ['codex.mjs', { command: ['apply_patch', PATCH] }, BLOCKED],
  ['codex.mjs', { input: PATCH.replace('AGENTS.md', 'src/app/page.tsx') }, ALLOWED],
  ['codex.mjs', { command: ['bash', '-lc', 'pnpm test'] }, ALLOWED],
  ['codex.mjs', { command: ['apply_patch', CONTEXT_PATCH] }, ALLOWED],
  ['codex.mjs', { command: ['bash', '-lc', HEREDOC_PATCH] }, ALLOWED],
  ['codex.mjs', { input: CONTEXT_PATCH }, ALLOWED],
  ['codex.mjs', { command: ['bash', '-lc', `${HEREDOC_PATCH}\nvercel --prod`] }, BLOCKED],
  ['claude-code.mjs', { file_path: `${ROOT}${COMMITTED}` }, BLOCKED],
  ['claude-code.mjs', { file_path: `${ROOT}${NEW_MIGRATION}` }, ALLOWED],
  ['codex.mjs', { command: ['apply_patch', PATCH.replace('AGENTS.md', COMMITTED)] }, BLOCKED],
]

for (const [adapter, toolInput, expected] of SAMPLES) {
  test(`${adapter} ${JSON.stringify(toolInput).slice(0, 60)} -> exit ${expected}`, () => {
    const result = run(adapter, toolInput)
    // A spawn that failed (e.g. EPERM) reports no real exit code: never read it as a verdict.
    assert.equal(result.error, undefined, String(result.error))
    assert.equal(result.status, expected, result.stderr)
    if (expected === BLOCKED) assert.ok(result.stderr.startsWith(rules.framing.es), result.stderr)
    else assert.equal(result.stderr, '')
  })
}
