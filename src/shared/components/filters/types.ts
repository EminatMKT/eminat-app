import type { FilterDef } from '@/shared/utils'

/** Lo que cualquier control del motor necesita para dibujar un def y devolver lo elegido.
 *  Copiado en dos controles, es como el mismo vocabulario empieza a pedir cosas distintas. */
export type ControlProps<T> = {
  def: FilterDef<T>
  items: T[]
  value: string
  onChange: (value: string) => void
}
