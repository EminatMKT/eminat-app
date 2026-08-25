// centinela-exime: archivo-extenso@2 — 63 líneas y ya salieron los tipos (tipos.ts) y el
// parseo de markdown (parser-md.ts). Lo que queda es UNA función, `cargar()`: partirla más
// dejaría mitades que sólo se usan entre sí.
// Lectura de las reglas: carga de los checks con sus tests desde rules/*.md.
// La sintaxis completa (bloques <!-- check: --> y líneas test:) vive en rules/README.md.

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { Check, TestDeRegla } from "./tipos.ts"

export type { Check, TestDeRegla }
import { secciones, motivo } from "./parser-md.ts"

export { secciones }

export const RULES = join(import.meta.dir, "..")
export const RUTA_TEST = "src/features/x/components/Y/index.tsx" // ruta default para los test:

const CHECK_RE = /<!--\s*check:\s*([\s\S]*?)\s*-->/g

const CAMPOS_DEL_MOTOR = new Set(["pattern", "detector", "requires", "absent", "exime", "version", "files", "except", "paths"])

export function cargar(): Check[] {
  const checks: Check[] = []
  for (const nombre of readdirSync(RULES).filter((f) => f.endsWith(".md")).sort()) {
    for (const [titulo, cuerpo] of secciones(readFileSync(join(RULES, nombre), "utf8"))) {
      for (const crudo of [...cuerpo.matchAll(CHECK_RE)].map((m) => m[1])) {
        const lineas = crudo.split("\n").map((l) => l.trim()).filter(Boolean)
        const campos: Record<string, string> = {}
        const tests: TestDeRegla[] = []
        for (const l of lineas.slice(1)) {
          if (l.startsWith("test:")) {
            const [resultado, contenido = ""] = l.slice(5).split("::")
            const partes = resultado.trim().split(/\s+/)
            tests.push({
              esperaFalla: partes[0] !== "pasa",
              esNuevo: !partes.includes("existente"),
              path: partes.find((p) => p.startsWith("@"))?.slice(1) || RUTA_TEST,
              contenido: contenido.trim(),
            })
          } else {
            const i = l.indexOf(":")
            if (i > 0) campos[l.slice(0, i).trim()] = l.slice(i + 1).trim()
          }
        }
        checks.push({
          soloNuevos: (lineas[0] ?? "").includes("contact"),
          regla: `${nombre} · ${titulo}`,
          motivo: motivo(cuerpo),
          pattern: campos.pattern,
          detector: campos.detector,
          requires: campos.requires,
          absent: campos.absent,
          exime: campos.exime,
          version: campos.version ? Number(campos.version) : undefined,
          files: (campos.files ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          except: (campos.except ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          paths: campos.paths ? campos.paths.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          params: Object.fromEntries(Object.entries(campos).filter(([k]) => !CAMPOS_DEL_MOTOR.has(k))),
          tests,
        })
      }
    }
  }
  return checks
}
