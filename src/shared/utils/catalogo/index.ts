// La frontera entre un `string` que viene de afuera y un catálogo cerrado. Aparece cada vez que
// un componente COMPARTIDO emite un valor suelto —AppShell avisa qué pestaña se tocó, un select
// devuelve su `value`— y el módulo que lo recibe sí tiene un catálogo: sin esto la salida es un
// `as MiTipo`, que no valida nada, sólo silencia al compilador (ver rules/codigo.md).

// Type guard para un catálogo cualquiera. `esDelCatalogo(TABS)(v)` estrecha `string` al tipo
// del catálogo, de verdad: si el valor no está, no pasa.
export const esDelCatalogo = <T extends string>(valores: readonly T[]) =>
  (v: string): v is T => (valores as readonly string[]).includes(v)

// El mismo guard, ya envuelto para pasarlo como handler: devuelve una función que aplica el
// valor sólo si pertenece al catálogo, y lo ignora si no. Lo que se descarta se descarta en
// silencio a propósito — un valor fuera del catálogo es un bug de quien lo emite, no algo que
// el usuario pueda arreglar leyendo un mensaje.
export const soloDelCatalogo = <T extends string>(valores: readonly T[], aplicar: (v: T) => void) =>
  (v: string): void => {
    if (esDelCatalogo(valores)(v)) aplicar(v)
  }
