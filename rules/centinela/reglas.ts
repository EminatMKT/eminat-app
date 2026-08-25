// Lectura de las reglas: tipos, parser de secciones y carga de checks con sus tests.
// La sintaxis completa (bloques <!-- check: --> y líneas test:) vive en rules/README.md.

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

export const RULES = join(import.meta.dir, "..")
export const RUTA_TEST = "src/features/x/components/Y/index.tsx" // ruta default para los test:

const CHECK_RE = /<!--\s*check:\s*([\s\S]*?)\s*-->/g
const FENCE_RE = /```[\s\S]*?```/g

export type TestDeRegla = {
  esperaFalla: boolean
  esNuevo: boolean
  path: string
  contenido: string
}

export type Check = {
  soloNuevos: boolean
  regla: string
  motivo: string
  pattern?: string
  detector?: string
  requires?: string
  absent?: string
  files: string[]
  except: string[]
  paths?: string[]
  tests: TestDeRegla[]
}

export function secciones(md: string): [string, string][] {
  // (título, cuerpo) por cada ## o ###; sin los ``` para no leer ejemplos.
  const out: [string, string][] = []
  let titulo: string | null = null
  let cuerpo: string[] = []
  for (const linea of md.replace(FENCE_RE, "").split("\n")) {
    if (/^#{2,3}\s/.test(linea)) {
      if (titulo) out.push([titulo, cuerpo.join("\n")])
      titulo = linea.replace(/^#+\s*/, "").trim()
      cuerpo = []
    } else if (titulo) cuerpo.push(linea)
  }
  if (titulo) out.push([titulo, cuerpo.join("\n")])
  return out
}

function motivo(cuerpo: string): string {
  const m = cuerpo.match(/\*\*Motivo:?\*\*:?\s*([\s\S]+?)(?:\n\n|$)/)
  return m ? m[1].split(/\s+/).join(" ").trim() : ""
}

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
          files: (campos.files ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          except: (campos.except ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          paths: campos.paths ? campos.paths.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          tests,
        })
      }
    }
  }
  return checks
}
