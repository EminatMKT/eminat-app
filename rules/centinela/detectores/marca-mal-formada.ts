export function marcaMalFormada(texto: string): boolean {
  // Una marca de exención que NO cumple `clave@version — razón`. Es el fallo más traicionero
  // del mecanismo: una marca mal escrita no exime de nada y el archivo frena por la regla
  // original, sin que nadie relacione una cosa con la otra.
  for (const m of texto.matchAll(/centinela-exime:([^\n]*)/g)) {
    if (!/^\s*[a-zA-Z][\w-]*@\d+\s*[—-]\s*\S+/.test(m[1])) return true
  }
  return false
}
