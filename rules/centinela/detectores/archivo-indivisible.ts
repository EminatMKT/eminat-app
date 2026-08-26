import { LIMITE_DURO } from "./limites.ts"
import { num, type Detector } from "./tipos.ts"

export const archivoIndivisible: Detector = (texto, _path, params) => {
  // El techo duro, sin exención posible. Va como check aparte justamente para eso: el motor
  // sólo salta el check que declara `exime:`, y éste no lo declara.
  return texto.split("\n").length > num(params, "duro", LIMITE_DURO)
}
