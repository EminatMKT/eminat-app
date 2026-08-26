// Los dos escalones del tamaño de un archivo. Viven aparte porque los comparten dos detectores
// —el blando admite marca, el duro no— y porque son EL número de la regla: se leen y se cambian
// acá, no adentro de la función que los usa.
export const LIMITE_BLANDO = 50
export const LIMITE_DURO = 150
