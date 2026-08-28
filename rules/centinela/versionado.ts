import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { RULES } from "./reglas.ts"
import { secciones } from "./parser-md.ts"

const CHECK_RE = /<!--\s*check:\s*([\s\S]*?)\s*-->/

type Firmada = { version: number; cuerpo: string }

// Una sección con check, reducida a lo que importa comparar: su versión y su texto SIN la línea
// de versión (si no, subir la versión contaría como cambio y la regla se mordería la cola).
function firmadas(md: string): Map<string, Firmada> {
  const out = new Map<string, Firmada>()
  for (const [titulo, cuerpo] of secciones(md)) {
    const bloque = cuerpo.match(CHECK_RE)
    if (!bloque) continue
    const v = bloque[1].match(/^\s*version:\s*(\d+)/m)
    out.set(titulo, {
      version: v ? Number(v[1]) : 0,
      cuerpo: cuerpo.replace(/^\s*version:\s*\d+\s*$/m, "").replace(/\s+/g, " ").trim(),
    })
  }
  return out
}

const enHead = (archivo: string): string | null => {
  const p = Bun.spawnSync(["git", "show", `HEAD:rules/${archivo}`], { cwd: join(RULES, "..") })
  return p.exitCode === 0 ? p.stdout.toString() : null
}

// Una regla que cambia sin subir su versión miente: quien la leyó ayer cree que sigue diciendo
// lo mismo, y sus marcas de exención —firmadas contra la versión vieja— siguen valiendo para un
// texto que ya no es el que se revisó.
export function reglasCambiadasSinVersionar(): string[] {
  const problemas: string[] = []
  for (const archivo of readdirSync(RULES).filter((f) => f.endsWith(".md"))) {
    const antes = enHead(archivo)
    if (antes === null) continue // archivo nuevo: no hay con qué comparar
    const viejas = firmadas(antes)
    for (const [titulo, ahora] of firmadas(readFileSync(join(RULES, archivo), "utf8"))) {
      const vieja = viejas.get(titulo)
      if (!vieja || vieja.version === 0) continue // sección nueva, o sin versión previa
      if (vieja.cuerpo !== ahora.cuerpo && vieja.version === ahora.version)
        problemas.push(`«${archivo} · ${titulo}» cambió pero sigue en version: ${ahora.version}`)
    }
  }
  return problemas
}
