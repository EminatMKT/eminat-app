'use client'
import { useCallback, useState, type ChangeEvent } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { reunionesRepo } from '@/shared/data'
import { localDate } from '@/shared/utils'
import { validarReunion } from '@/features/reuniones/utils/validarReunion'
import type { ReunionForm } from '@/features/reuniones/types'

// La fecha por defecto sale de `localDate()`, que resuelve en la zona de quien mira. Sacarla de
// la fecha en UTC —la trampa que documenta `@/shared/utils/dates`— haría que en UTC-4, después
// de las 20:00, una reunión cargada hoy naciera fechada mañana.
// Ningún campo arranca con un valor de dominio escrito a mano —`modalidad` decía `'presencial'`
// y era el bug de "New task": un valor que nadie eligió y queda guardado igual—. Todos parten
// del placeholder vacío, y `validarReunion` rechaza lo que sea obligatorio.
export const FORM_VACIO: ReunionForm = {
  empresa: '', titulo: '', tipo: '', lugar: '',
  modalidad: '', fecha: localDate(), hora_inicio: '', hora_fin: '', objetivo: '',
}

type Estado = { form: ReunionForm; errores: I18nKey[]; guardando: boolean; fallo: string | null }
const INICIAL: Estado = { form: FORM_VACIO, errores: [], guardando: false, fallo: null }

export function useReunion(creadoPor: string | null) {
  const [estado, setEstado] = useState<Estado>(INICIAL)
  const { form, errores, guardando, fallo } = estado

  const set = useCallback(
    (k: keyof ReunionForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEstado(p => ({ ...p, form: { ...p.form, [k]: e.target.value } })),
    [],
  )

  const reiniciar = useCallback(() => setEstado({ ...INICIAL, form: { ...FORM_VACIO, fecha: localDate() } }), [])

  // Devuelve si guardó, para que quien llama cierre el modal SÓLO cuando de verdad se guardó.
  const guardar = useCallback(async (): Promise<boolean> => {
    const fallos = validarReunion(estado.form)
    if (fallos.length) {
      setEstado(p => ({ ...p, errores: fallos }))
      return false
    }
    setEstado(p => ({ ...p, errores: [], guardando: true, fallo: null }))
    const { error } = await reunionesRepo.insert(estado.form, creadoPor)
    setEstado(p => ({ ...p, guardando: false, fallo: error?.message ?? null }))
    return !error
  }, [estado.form, creadoPor])

  const resultado = { form, errores, guardando, fallo, set, guardar, reiniciar }
  return resultado
}
