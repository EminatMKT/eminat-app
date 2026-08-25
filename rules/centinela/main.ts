#!/usr/bin/env bun
/**
 * Centinela de las reglas del repo — motor compartido por todos los CLIs.
 * No contiene ninguna regla: las lee de rules/*.md (sintaxis en rules/README.md).
 * Piezas: reglas.ts (parser) · detectores/ (uno por archivo) · detectores.ts (el registro) ·
 * evaluar.ts · contexto.ts · mensajes.ts · self-check.ts · modos.ts (protocolos) ·
 * main.ts (despacho).
 *
 * Modos:
 *   (sin args)     hook PreToolUse de Claude Code: JSON por stdin, exit 2 bloquea
 *   check <path>   contenido por stdin → JSON {"fallan": [...]} (no corta)
 *   contexto CMD…  títulos de reglas aplicables antes de ese comando Bash
 *   --self-check   corre los tests declarados en las reglas; falla EN VOZ ALTA
 */
import { contexto } from "./contexto.ts"
import { selfCheck } from "./self-check.ts"
import { modoHook, modoCheck } from "./modos.ts"

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
  } catch (e) {
    // Un centinela roto NUNCA frena el trabajo — pero SÍ avisa. Callarse dejaba al guardia
    // ciego y a nadie enterado, que es la peor de las dos fallas posibles.
    console.error(`⚠️  centinela caído (no bloquea): ${(e as Error).message}`)
    code = 0
  }
}
process.exit(code)
