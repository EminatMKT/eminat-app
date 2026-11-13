// Shapes the config generators share: the rule fields only they read, an execpolicy prefix
// (each element one word or a union of words), the configs they build and the files they write.
import type { Rule, Texts } from '../core/types'
import type samples from './hook-samples.json'

type CodexFields = {
  codex: string
  codexPrefixes?: string[][]
  denySubcommands?: string[]
  codexRemotes?: string[]
}
type CodexParsing = { codexRunners: string[][] }
type ClaudeFields = { readPaths?: string[] }
export type GuardRule = Rule & CodexFields & ClaudeFields
export type GuardFile = {
  framing: Texts
  unavailable: Texts
  parsing: CodexParsing
  rules: GuardRule[]
}
export type Element = string | string[]
export type Pattern = Element[]
export type Builder = (rule: GuardRule) => Pattern[]
export type Category = { label: string; keep: (rule: GuardRule) => boolean }
export type Permissions = { deny: string[]; ask: string[] }
export type Handler = { type: string; command: string }
export type ClaudeHandler = Handler & { onFailure: string }
export type CodexHandler = Handler & { statusMessage: string }
export type HookGroup = { matcher: string; hooks: Handler[] }
export type Hooks = { PreToolUse: HookGroup[] }
export type ClaudeSettings = { $schema: string; permissions: Permissions; hooks: Hooks }
export type CodexHooks = { description: string; hooks: Hooks }
export type HookPlace = { root: string; adapter: string }
export type Target = { path: string; render: () => string }
export type HookSample = (typeof samples)[number]
