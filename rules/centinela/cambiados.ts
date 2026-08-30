import { join } from "node:path"
import { RULES } from "./reglas.ts"

// Qué archivos tocó esta rama: lo ya commiteado contra `main` MÁS lo que está sin guardar, así
// cubre tanto lo que se va a pushear como lo que está por commitearse.
export const RAIZ = join(RULES, "..")

export const git = (args: string[]) => Bun.spawnSync(["git", ...args], { cwd: RAIZ })
export const salida = (args: string[]) => git(args).stdout.toString()

export const baseDeLaRama = () => salida(["merge-base", "HEAD", "main"]).trim() || "HEAD"

export function archivosCambiados(): string[] {
  const commiteados = salida(["diff", "--name-only", baseDeLaRama(), "HEAD"]).split("\n")
  const sueltos = salida(["status", "--porcelain"]).split("\n").map((l) => l.slice(3).trim())
  const todos = new Set([...commiteados, ...sueltos].filter(Boolean))
  return [...todos].filter((f) => /\.(ts|tsx|css|sql)$/.test(f)).sort()
}
