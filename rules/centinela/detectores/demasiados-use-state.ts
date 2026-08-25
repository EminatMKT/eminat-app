export function demasiadosUseState(texto: string): boolean {
  // UN useState por componente o hook. Medido antes de fijarlo: de los archivos del repo con
  // dos o tres, NINGUNO era el caso "loading + error" —el que justifica tenerlos sueltos—;
  // todos eran campos que viajan juntos. La exención la resuelve el motor (`exime:` en el
  // bloque check), no este detector.
  let n = 0
  for (const linea of texto.split("\n")) {
    const l = linea.trim()
    if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) continue
    n += linea.match(/\buseState[<(]/g)?.length ?? 0
  }
  return n >= 2
}
