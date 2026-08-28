// Los protocolos de cada CLI: cómo entra el trabajo y cómo se responde. El despacho entre
// modos vive en main.ts; acá está qué hace cada uno.
import { revisar, CANAL_BASH } from "./evaluar.ts"
import { contexto } from "./contexto.ts"
import { checklist } from "./mensajes.ts"
import { sugerencia } from "./sugerencias.ts"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { RULES } from "./reglas.ts"
import type { PayloadHook } from "./tipos.ts"

// Hook PreToolUse de Claude Code: JSON por stdin, exit 2 bloquea la operación.
export async function modoHook(): Promise<number> {
  let payload: PayloadHook
  try { payload = JSON.parse(await Bun.stdin.text()) as PayloadHook } catch { return 0 }
  const tool = payload.tool_name ?? ""
  const ti = payload.tool_input ?? {}
  const path = String(ti.file_path ?? "").replace(/\\/g, "/")

  if (tool === "Bash") {
    const cmd = String(ti.command ?? "")
    // Hay reglas que protegen de algo que nunca llega a escribirse en un archivo: `db reset`
    // borra la base local y no hay seed que la devuelva. Se frenan acá o no se frenan.
    const prohibidos = revisar(CANAL_BASH, cmd, false)
    if (prohibidos.length) {
      console.error(checklist("el comando", prohibidos))
      return 2
    }
    const ctx = contexto(cmd)
    if (ctx)
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: ctx } }))
    return 0
  }

  if (!["Write", "Edit", "MultiEdit"].includes(tool) || !path) return 0
  let texto = ti.content || ti.new_string || ""
  for (const e of ti.edits ?? []) texto += "\n" + (e.new_string || "")
  const fallan = revisar(path, texto)
  // El recordatorio va SIEMPRE que corresponda, bloquee o no. Si sólo apareciera cuando el
  // archivo pasa, en un componente nuevo —que casi siempre frena por alguna regla— llegaría
  // después de haberlo escrito, que es tarde para una skill de diseño.
  const nota = sugerencia(path, texto, !existsSync(path))
  if (fallan.length) {
    console.error(checklist(path, fallan) + (nota ? `\n\n${nota}` : ""))
    return 2
  }
  if (nota)
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: nota } }))
  return 0
}

// `check <path>`: contenido por stdin → JSON con las fallas. No corta nada; es para otros CLIs.
export async function modoCheck(path: string): Promise<number> {
  const fallan = revisar(path, await Bun.stdin.text())
  console.log(JSON.stringify({ fallan }))
  return 0
}

// Los archivos que describen el proyecto. El hook sólo los revisa cuando alguien los EDITA, y
// una referencia se pudre justamente cuando nadie los toca: se mueve un directorio y el `.md`
// sigue diciendo lo de antes. Este barrido los mira sin esperar la edición; corre en pre-push.
const CONTEXTO = ["CLAUDE.md", "README.md", "AGENTS.md"]

/** Barrido de los archivos de contexto. Devuelve 1 si alguno quedó desactualizado. */
export function modoContexto(): number {
  const raiz = join(RULES, "..")
  let malas = 0
  for (const doc of CONTEXTO) {
    const abs = join(raiz, doc)
    if (!existsSync(abs)) continue
    // esNuevo=false: los archivos existen, así que sólo aplican las reglas `block`.
    for (const f of revisar(abs, readFileSync(abs, "utf8"), false)) {
      console.error(`✖ ${doc} — ${f.regla}\n   ${f.motivo}`)
      malas++
    }
  }
  if (malas === 0) console.log(`contexto OK — ${CONTEXTO.length} archivos al día`)
  return malas ? 1 : 0
}
