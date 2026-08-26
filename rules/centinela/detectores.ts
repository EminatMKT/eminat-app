// El registro de detectores: qué nombre cita el campo `detector:` de un check y qué función lo
// resuelve. Cada detector vive en su propio archivo bajo `detectores/` — uno por función, como
// exige rules/codigo.md; acá sólo se los nombra.
import {
  archivoExtenso,
  archivoIndivisible,
  centinelaSinFiltro,
  checkInlineEnum,
  componenteFueraDeCarpeta,
  demasiadosUseState,
  dosComponentesEnArchivo,
  estadoAccedidoPorCamino,
  gateIncompleto,
  indexQueDefine,
  jsxEnProp,
  marcaMalFormada,
  marcaSinInventario,
  markupSustancial,
  objetoLiteralEnReturn,
  reglaSinCheck,
  styleInline,
  tablaEnComponente,
  textoSinTraducir,
  tresTiposOMas,
} from "./detectores/index.ts"
import type { Detector } from "./detectores/tipos.ts"

export type { Detector }

export { LIMITE_BLANDO, LIMITE_DURO } from "./detectores/limites.ts"

export const DETECTORES: Record<string, Detector> = {
  archivo_extenso: archivoExtenso,
  archivo_indivisible: archivoIndivisible,
  centinela_sin_filtro: centinelaSinFiltro,
  check_inline_enum: checkInlineEnum,
  componente_fuera_de_carpeta: componenteFueraDeCarpeta,
  demasiados_use_state: demasiadosUseState,
  dos_componentes_en_archivo: dosComponentesEnArchivo,
  estado_accedido_por_camino: estadoAccedidoPorCamino,
  gate_incompleto: gateIncompleto,
  index_que_define: indexQueDefine,
  jsx_en_prop: jsxEnProp,
  marca_mal_formada: marcaMalFormada,
  marca_sin_inventario: marcaSinInventario,
  markup_sustancial: markupSustancial,
  objeto_literal_en_return: objetoLiteralEnReturn,
  regla_sin_check: reglaSinCheck,
  style_inline: styleInline,
  tabla_en_componente: tablaEnComponente,
  texto_sin_traducir: textoSinTraducir,
  tres_tipos_o_mas: tresTiposOMas,
}
