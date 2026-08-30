'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero. El más cerca
// es `WarningCallout` y NO es esto: avisa UNA cosa con un detalle desplegable tras un <details>,
// y acá hay N errores que tienen que verse todos juntos y sin abrir nada. Tampoco es "agregarle
// un prop": habría que cambiarle la forma —de un mensaje a una lista— y sacarle el <details>,
// que es justo lo que lo hace accesible sin estado.

// Los errores de validación de un formulario. Nace en `shared` y no en el módulo porque su
// nombre no menciona ninguno: todo formulario del repo valida y tiene que mostrar qué falta.
type Props = {
  /** Claves de i18n TIPADAS. Que sean `I18nKey` y no `string` es lo que evita un `as` en quien
   *  la usa, y hace que una clave inexistente no compile (ver rules/codigo.md). */
  errores: I18nKey[]
}

// `role="alert"` y no un <p> suelto: un lector de pantalla tiene que anunciar los errores cuando
// aparecen, no cuando alguien vuelva a recorrer el formulario.
export default function ErrorList({ errores }: Props) {
  const { t } = useT()
  if (!errores.length) return null

  return (
    <ul className={s.lista} role="alert">
      {errores.map(e => <li key={e}>{t(e)}</li>)}
    </ul>
  )
}
