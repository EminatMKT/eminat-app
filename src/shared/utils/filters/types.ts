// Las formas del motor de filtros. Vivían dentro de `defs/index.ts`, que además tiene el
// predicado y la derivación de opciones: tres tipos y tres funciones en un archivo, con los tipos
// ocupando la mitad de arriba. Salieron el 04/09/2026, cuando `visibleDefs` no entró en las 50
// líneas — y de paso paga el aviso de «tres tipos o más van a su propio archivo», que ese archivo
// arrastraba desde antes.

import type { I18nKey } from '@/shared/i18n'

// El vocabulario de controles del motor. Tiene nombre propio porque cada uno ES un componente
// —`SelectFilter`, `InputFilter`— y esos componentes necesitan tipar qué variante dibujan sin
// copiar la lista: copiada, agregar un control acá dejaría al componente aceptando uno que no
// sabe dibujar.
export type FilterKind = 'select' | 'text' | 'date'

export interface FilterDef<T> {
  key: string
  // Clave i18n del placeholder "Todos …" — la traduce el caller. Va tipada como `I18nKey` y no
  // como `string` porque `string` obligaba a cada consumidor a escribir `t(d.labelKey as
  // I18nKey)`: el cast estaba en el punto de uso y el problema acá. Tipada en el origen, una
  // clave que no existe deja de compilar donde se escribe el def.
  labelKey: I18nKey
  // Cómo se llama la COLUMNA, en una palabra: «Trimestre», «Responsable». Es distinto de
  // `labelKey`, que es el placeholder («Todos los trimestres») y sólo se lee mientras el filtro
  // está vacío. Con un valor puesto, un `<select>` nativo muestra el valor y nada más — «Q2» y
  // «Ana Sinequipo» uno al lado del otro no dicen de qué columna son. Va requerido a propósito:
  // un filtro que no sabe nombrar su columna es el bug que esto arregla.
  nameKey: I18nKey
  kind?: FilterKind // control a renderizar; default 'select'
  options?: (items: T[]) => string[] // solo para 'select': valores elegibles (de los datos o de un dominio)
  // Cómo se MUESTRA cada opción, cuando el valor guardado no se puede leer: un uuid de
  // responsable, o un estado cuyo canónico está en español y la app puede estar en inglés
  // (ver rules/codigo.md, "el valor canónico NO es la etiqueta"). Sin esto, el
  // desplegable rotula con el dato crudo. Default: el valor mismo.
  optionLabel?: (value: string) => string
  // Con qué valor arranca el filtro cuando el usuario todavía no lo tocó. Es lo que hace usable
  // un tablero donde conviven cinco áreas: se abre en la propia y desde ahí se abre a las demás.
  // NO es control de acceso — quitarlo muestra todo, y eso es a propósito.
  defaultValue?: string
  match: (item: T, value: string) => boolean // ¿el item pasa este filtro para ese valor?
}

export type FilterValues = Record<string, string>
