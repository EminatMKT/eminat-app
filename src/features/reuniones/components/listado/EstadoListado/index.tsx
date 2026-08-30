'use client'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero. `ErrorList`
// es lo más cerca y no sirve: muestra N errores de VALIDACIÓN de un formulario, y acá hay UNO
// solo de tres clases distintas. Y no es "agregarle un prop": habría que darle un modo neutro,
// o sea otra forma. Vive en el módulo; el día que una segunda lista lo pida, sube a shared.

// Los tres estados en que una lista no muestra filas. Son excluyentes, así que se deciden acá y
// no con tres condiciones sueltas en el JSX del padre.
type Props = {
  cargando: boolean
  error: string | null
  /** Cuántas filas quedaron DESPUÉS de filtrar, y si había búsqueda: distinguen "todavía no hay
   *  nada" de "tu búsqueda no encontró nada", que son dos mensajes distintos. */
  visibles: number
  buscando: boolean
}

export default function EstadoListado({ cargando, error, visibles, buscando }: Props) {
  const { t } = useT()
  if (error) return <p className={s.error}>{t('common.errorWithDetail', { detail: error })}</p>
  if (cargando) return <p className={s.vacio}>{t('common.loading')}</p>
  if (visibles > 0) return null
  return <p className={s.vacio}>{t(buscando ? 'reuniones.sinResultados' : 'reuniones.vacio')}</p>
}
