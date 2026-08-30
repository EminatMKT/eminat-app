import { readFileSync } from "node:fs"
import { join } from "node:path"
import { revisar } from "./evaluar.ts"
import { RAIZ, archivosCambiados, baseDeLaRama, git } from "./cambiados.ts"
import { esReescritura } from "./reescritura.ts"

// Corre las reglas sobre lo que cambió la rama, sin esperar una edición.
//
// Por qué hace falta, aunque el hook ya corra antes de cada Write/Edit: el hook intercepta esas
// dos herramientas y NADA más. Un `sed`, un script de python, un `cat > archivo` desde Bash
// escriben sin pasar por él — y así es como el 29/08 entraron cuatro archivos pasados del límite
// de líneas sin que nada frenara. No fue deliberado: eran ediciones mecánicas en varios archivos,
// que es justo cuando uno sale de las herramientas que el guardia mira.
//
// Compara contra la LÍNEA BASE y reporta sólo lo que EMPEORÓ. Es lo que lo hace un gate posible:
// el repo tiene deuda declarada —archivos largos, `useState` de más— y un barrido que la contara
// fallaría siempre, o sea que alguien lo apagaría en una semana. Lo que promete es más chico y
// más cumplible: por acá no pasa una regla que ANTES se cumplía y ahora no.
const reglasRotas = (archivo: string, texto: string, esNuevo: boolean) =>
  new Set(revisar(archivo, texto, esNuevo).map((f) => f.regla))

export function barrido(): number {
  const base = baseDeLaRama()
  const archivos = archivosCambiados()
  const problemas: string[] = []

  for (const archivo of archivos) {
    let ahora: string
    try { ahora = readFileSync(join(RAIZ, archivo), "utf8") } catch { continue } // borrado

    const p = git(["show", `${base}:${archivo}`])
    // "Nuevo" no es sólo el que no existía: también el que se reescribió entero. Ver
    // reescritura.ts — sin eso, rehacer un archivo conserva sus incumplimientos.
    const nuevo = p.exitCode !== 0 || esReescritura(archivo, base, ahora.trimEnd().split("\n").length)
    const antes = nuevo ? new Set<string>() : reglasRotas(archivo, p.stdout.toString(), false)

    for (const regla of reglasRotas(archivo, ahora, nuevo)) {
      if (!antes.has(regla)) problemas.push(`  ${archivo} · ${regla}`)
    }
  }

  if (problemas.length) {
    console.error(`barrido: ${problemas.length} regla(s) que ANTES se cumplían y ahora no:\n${problemas.join("\n")}`)
    console.error("\nCada una se arregla, o se firma con su marca + su fila en rules/EXENCIONES.md.")
    return 1
  }
  console.log(`barrido OK — ${archivos.length} archivos cambiados, ninguno empeoró`)
  return 0
}
