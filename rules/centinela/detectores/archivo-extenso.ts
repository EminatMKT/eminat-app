import { LIMITE_BLANDO } from "./limites.ts"
import { num, type Detector } from "./tipos.ts"


export const archivoExtenso: Detector = (texto, _path, params) => {
  // Dos escalones. Hasta 50 líneas no se pregunta nada. De 51 a 150 el archivo puede quedarse
  // si lleva su marca versionada —el motor la mira ANTES que a este detector, así que si
  // llegamos acá es que no la tiene—. Pasadas las 150 no hay marca que valga: se parte.
  const lineas = texto.split("\n").length
  return lineas > num(params, "blando", LIMITE_BLANDO)
}
