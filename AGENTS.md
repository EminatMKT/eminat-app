# Reglas de agentes

Las reglas de este repo viven en `rules/` — aplican a cualquier CLI (Claude Code,
opencode, etc.). El motor que las aplica antes de cada Write/Edit es
`rules/centinela/` (TypeScript, corre con Bun): Claude Code lo invoca como hook
PreToolUse y opencode por `.opencode/plugin/rules-review.ts`, que sólo traduce
el contrato de cada CLI.

@rules/README.md
