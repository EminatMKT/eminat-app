// Qué archivos escribe una línea de Bash por heredoc. El hook `PreToolUse` recibe el comando
// entero —cuerpo del heredoc incluido—, así que un `cat > src/x.ts <<'EOF' … EOF` trae la ruta
// y el contenido: alcanza para correrle las MISMAS reglas de archivo que a un Write.

/** El `<<DELIM` que abre. `<<-` (con guion) también, y el delimitador puede venir citado. */
const ABRE = /<<-?\s*(['"]?)([A-Za-z_]\w*)\1/
/** A dónde va: una redirección o un `tee`. Sin esto es un heredoc a un programa (`python3 -`). */
const DESTINO = /(?:>>?\s*|\btee\s+(?:-a\s+)?)(['"]?)([^\s'"<>|;&]+)\1/

export type Escritura = { path: string; texto: string }

export function archivosEscritos(cmd: string): Escritura[] {
  const lineas = cmd.split("\n")
  const salida: Escritura[] = []

  for (let i = 0; i < lineas.length; i++) {
    const abre = lineas[i].match(ABRE)
    const destino = abre && lineas[i].match(DESTINO)
    if (!abre || !destino) continue

    // El cuerpo termina en la línea que ES el delimitador. Si no aparece —comando cortado,
    // heredoc mal cerrado— se toma hasta el final: mejor evaluar de más que dejar pasar.
    const cierra = lineas.findIndex((l, j) => j > i && l.trim() === abre[2])
    const fin = cierra === -1 ? lineas.length : cierra
    salida.push({ path: destino[2].replace(/^\.\//, ""), texto: lineas.slice(i + 1, fin).join("\n") })
    i = fin
  }
  return salida
}
