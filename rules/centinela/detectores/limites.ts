// Los dos escalones del tamaño de un archivo. Viven aparte porque los comparten dos detectores
// —el blando admite marca, el duro no— y porque son EL número de la regla: se leen y se cambian
// acá, no adentro de la función que los usa.
export const LIMITE_BLANDO = 50
export const LIMITE_DURO = 150

// Cuántas líneas tiene de verdad. `split("\n")` a secas cuenta UNA DE MÁS en cualquier archivo
// que termine en salto de línea —o sea, en todos—, así que el límite efectivo era 49 y no 50:
// un archivo de exactamente 50 se reportaba como 51 y frenaba contra una regla que dice
// "0–50 pasa". Encontrado el 29/08 al recortar un archivo hasta el límite exacto y ver que
// seguía frenando. `trimEnd` además ignora las líneas en blanco del final, que no son código.
export const contarLineas = (texto: string) => texto.trimEnd().split("\n").length
