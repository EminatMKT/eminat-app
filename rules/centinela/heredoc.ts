// Qué archivos escribe una línea de Bash por heredoc. El hook `PreToolUse` recibe el comando
// entero —cuerpo del heredoc incluido—, así que un `cat > src/x.ts <<'EOF' … EOF` trae la ruta
// y el contenido: alcanza para correrle las MISMAS reglas de archivo que a un Write.
//
// Es un parser best-effort, y donde se equivoque tiene que equivocarse EVALUANDO DE MÁS. Un
// parser que cierra el heredoc antes que bash deja el resto del cuerpo sin mirar y no falla:
// pasa en silencio, que es la peor forma de fallar que puede tener un guardia. Lo que este
// parser no ve —una ruta en una variable, `sed -i`, un `open(p,'w')` de Python— lo agarra
// `pnpm rules:barrido` en pre-push.

/** El `<<DELIM` que abre. `<<-` permite sangrar el cierre con TABS; el delimitador puede venir
 *  citado (`<<'EOF'`), que en bash además apaga la interpolación. */
const ABRE = /<<(-?)\s*(['"]?)([A-Za-z_]\w*)\2/
/** A dónde va: una redirección o un `tee`. Sin esto es un heredoc a un programa (`python3 -`). */
const DESTINO = /(?:>>?\s*|\btee\s+(?:-a\s+)?)(['"]?)([^\s'"<>|;&]+)\1/

export type Escritura = { path: string; texto: string }

// Bash cierra SÓLO con una línea que es exactamente el delimitador: un espacio al final ya no
// cierra, y la sangría sólo vale con `<<-` y sólo con tabs. Antes esto usaba `.trim()`, que
// cerraba con cualquier línea que dijera EOF entre espacios — y todo lo que viniera después se
// escribía en el archivo sin que ninguna regla lo mirara.
const esCierre = (linea: string, delim: string, guion: boolean) =>
  (guion ? linea.replace(/^\t+/, "") : linea) === delim

export function archivosEscritos(cmd: string): Escritura[] {
  const lineas = cmd.split("\n")
  const salida: Escritura[] = []

  for (let i = 0; i < lineas.length; i++) {
    const abre = lineas[i].match(ABRE)
    const destino = abre && lineas[i].match(DESTINO)
    if (!abre || !destino) continue

    const [, guion, , delim] = abre
    // Sin cierre —comando cortado, heredoc mal cerrado— se toma hasta el final: de nuevo, mejor
    // evaluar de más que dejar pasar.
    const cierra = lineas.findIndex((l, j) => j > i && esCierre(l, delim, guion === "-"))
    const fin = cierra === -1 ? lineas.length : cierra
    salida.push({ path: destino[2].replace(/^\.\//, ""), texto: lineas.slice(i + 1, fin).join("\n") })
    i = fin
  }
  return salida
}
