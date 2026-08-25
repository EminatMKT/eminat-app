// Los protocolos de cada CLI: cómo entra el trabajo y cómo se responde. El despacho entre
// modos vive en main.ts; acá está qué hace cada uno.
import { revisar } from "./evaluar.ts"
import { contexto } from "./contexto.ts"
import { checklist } from "./mensajes.ts"
import type { PayloadHook } from "./tipos.ts"

// Hook PreToolUse de Claude Code: JSON por stdin, exit 2 bloquea la operación.
export async function modoHook(): Promise<number> {
  let payload: PayloadHook
  try { payload = JSON.parse(await Bun.stdin.text()) as PayloadHook } catch { return 0 }
  const tool = payload.tool_name ?? ""
  const ti = payload.tool_input ?? {}
  const path = String(ti.file_path ?? "").replace(/\\/g, "/")

  if (tool === "Bash") {
    const ctx = contexto(String(ti.command ?? ""))
    if (ctx)
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: ctx } }))
    return 0
  }

  if (!["Write", "Edit", "MultiEdit"].includes(tool) || !path) return 0
  let texto = ti.content || ti.new_string || ""
  for (const e of ti.edits ?? []) texto += "\n" + (e.new_string || "")
  const fallan = revisar(path, texto)
  if (!fallan.length) return 0
  console.error(checklist(path, fallan))
  return 2
}

// `check <path>`: contenido por stdin → JSON con las fallas. No corta nada; es para otros CLIs.
export async function modoCheck(path: string): Promise<number> {
  const fallan = revisar(path, await Bun.stdin.text())
  console.log(JSON.stringify({ fallan }))
  return 0
}
