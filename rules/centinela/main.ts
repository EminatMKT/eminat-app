#!/usr/bin/env bun
/**
 * Centinela de las reglas del repo — motor compartido por todos los CLIs.
 * No contiene ninguna regla: las lee de rules/*.md (sintaxis en rules/README.md).
 * Piezas: reglas.ts (parser) · detectores.ts · evaluar.ts · contexto.ts ·
 * mensajes.ts · self-check.ts · main.ts (protocolos de cada CLI).
 *
 * Modos:
 *   (sin args)     hook PreToolUse de Claude Code: JSON por stdin, exit 2 bloquea
 *   check <path>   contenido por stdin → JSON {"fallan": [...]} (no corta)
 *   contexto CMD…  títulos de reglas aplicables antes de ese comando Bash
 *   --self-check   corre los tests declarados en las reglas; falla EN VOZ ALTA
 */
import { revisar } from "./evaluar.ts"
import { contexto } from "./contexto.ts"
import { checklist } from "./mensajes.ts"
import { selfCheck } from "./self-check.ts"

async function modoHook(): Promise<number> {
  let payload: any
  try { payload = JSON.parse(await Bun.stdin.text()) } catch { return 0 }
  const tool: string = payload.tool_name ?? ""
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

async function modoCheck(path: string): Promise<number> {
  const fallan = revisar(path, await Bun.stdin.text())
  console.log(JSON.stringify({ fallan }))
  return 0
}

const argv = process.argv.slice(2)
let code: number
if (argv.includes("--self-check")) {
  try {
    code = selfCheck()
  } catch (e) {
    // acá sí se grita: es la herramienta con la que se editan las reglas
    console.error(`self-check FALLÓ — ${(e as Error).message}`)
    code = 1
  }
} else {
  try {
    if (argv.length === 2 && argv[0] === "check") code = await modoCheck(argv[1])
    else if (argv[0] === "contexto") {
      process.stdout.write(contexto(argv.slice(1).join(" ")))
      code = 0
    } else code = await modoHook()
  } catch {
    code = 0 // un centinela roto NUNCA frena el trabajo
  }
}
process.exit(code)
