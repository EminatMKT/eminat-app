export function tresTiposOMas(texto: string): boolean {
  // Cuenta DECLARACIONES de forma: `type`, `interface` y las enumeraciones —el
  // `enum` de TS y el objeto/array `as const`, que en este repo es la forma
  // habitual de enumerar (ESTADO, VERIFICADO)—. Las tres son lo mismo para esta
  // regla: describen un dominio, no lo ejecutan.
  // Exige el `=`, `<` o `{` que abre el cuerpo, así una re-exportación
  // (`export type { Actividad } from …`) o una mención cualquiera no suman. Sin
  // anclar a `^` para que un test de una sola línea pueda declarar las tres.
  const formas = /(?:^|[;\s])(?:export\s+)?(?:type|interface)\s+[A-Z]\w*\s*[=<{]/g
  const enums = /(?:^|[;\s])(?:export\s+)?(?:const\s+)?enum\s+[A-Z]\w*\s*\{/g
  const asConst = /\bas\s+const\b/g
  const total =
    (texto.match(formas)?.length ?? 0) +
    (texto.match(enums)?.length ?? 0) +
    (texto.match(asConst)?.length ?? 0)
  return total >= 3
}
