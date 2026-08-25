// Antes de un commit o de tocar la base, el repaso de los títulos que aplican.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { RULES, secciones } from "./reglas.ts"

const ROUTES: [RegExp, string][] = [
  [/\bgit\s+commit\b/, "proceso.md"],
  [/supabase|db\s+push|psql|pg_dump/, "base-de-datos.md"],
]

function staged(): string {
  try {
    const out = Bun.spawnSync(["git", "diff", "--cached", "--name-only"], { stdout: "pipe" })
      .stdout.toString().trim()
    return out
      ? "Índice actual (esto es lo que va a entrar al commit):\n" + out.split("\n").map((l) => "  " + l).join("\n")
      : ""
  } catch {
    return ""
  }
}

export function contexto(comando: string): string {
  for (const [patron, archivo] of ROUTES) {
    if (!new RegExp(patron).test(comando)) continue
    let titulos: string
    try {
      titulos = secciones(readFileSync(join(RULES, archivo), "utf8")).map(([t]) => `  · ${t}`).join("\n")
    } catch {
      continue
    }
    let ctx = `Repaso de reglas antes de esta acción (el texto completo está en rules/):\n\n— ${archivo}\n${titulos}`
    if (archivo === "proceso.md") {
      const extra = staged()
      if (extra) ctx += `\n\n${extra}`
    }
    return ctx
  }
  return ""
}
