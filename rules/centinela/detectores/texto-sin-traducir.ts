// Las funciones que muestran texto al usuario. El segundo argumento tiene que ser `t(...)`.
const AVISOS = /\b(mostrarMensaje)\s*\(\s*['"][^'"]*['"]\s*,\s*['"`]/

export function textoSinTraducir(texto: string, path: string): boolean {
  const esTsx = path.endsWith(".tsx")
  const lineas = texto.split("\n")
  let enTemplate = false
  for (const linea of lineas) {
    const l = linea.trim()
    if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) continue

    // Un aviso al usuario con el texto escrito a mano en vez de una clave de i18n.
    if (AVISOS.test(linea)) return true

    // Las plantillas de string (report-html y compañía) llevan HTML que NO es JSX: el mismo
    // `>texto<` ahí dentro es contenido de un template literal, no algo que React renderice.
    const backticks = (linea.match(/`/g) ?? []).length
    if (enTemplate) {
      if (backticks % 2 === 1) enTemplate = false
      continue
    }
    if (backticks % 2 === 1) { enTemplate = true; continue }

    if (!esTsx) continue
    // Texto suelto entre etiquetas: `>Guardar</`. Pide cuatro letras seguidas para no marcar
    // símbolos (`>✕<`, `>—<`) ni unidades (`>h<`), y exige que lo que cierre sea una etiqueta
    // (`</`) y no cualquier `<`: sin eso, la firma de un componente genérico
    // —`function X<V extends string>(props: Props<V>)`— daba `>(props: Props<` y se leía como
    // texto sin traducir. Un falso positivo que frena el trabajo enseña a ignorar al centinela.
    for (const m of linea.matchAll(/>([^<>{}]+)<\//g)) {
      const contenido = m[1].trim()
      if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(contenido)) return true
    }
  }
  return false
}
