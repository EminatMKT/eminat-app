'use client'
import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { reunionesRepo } from '@/shared/data'
import { formVacio } from '@/features/reuniones/constants'
import { reunionAForm } from '@/features/reuniones/utils/reunionAForm'
import { validarReunion } from '@/features/reuniones/utils/validarReunion'
import type { ReunionForm } from '@/features/reuniones/types'

type Estado = { form: ReunionForm; errores: I18nKey[]; guardando: boolean; fallo: string | null }
const inicial = (): Estado => ({ form: formVacio(), errores: [], guardando: false, fallo: null })

// Con `reunionId` edita la que ya existe; sin él, crea. Es el MISMO hook porque son los mismos
// campos y la misma validación: partirlo en dos obligaba a mantenerla dos veces.
export function useReunion(creadoPor: string | null, reunionId?: string) {
  const [estado, setEstado] = useState<Estado>(inicial)
  const { form, errores, guardando, fallo } = estado

  useEffect(() => {
    if (!reunionId) return
    void reunionesRepo.byId(reunionId).then(({ data, error }) =>
      setEstado(p => (data ? { ...p, form: reunionAForm(data) } : { ...p, fallo: error?.message ?? null })))
  }, [reunionId])

  const set = useCallback(
    (k: keyof ReunionForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEstado(p => ({ ...p, form: { ...p.form, [k]: e.target.value } })),
    [],
  )

  // Devuelve si guardó, para que quien llama cierre el modal SÓLO cuando de verdad se guardó.
  const guardar = useCallback(async (): Promise<boolean> => {
    const fallos = validarReunion(estado.form)
    if (fallos.length) {
      setEstado(p => ({ ...p, errores: fallos }))
      return false
    }
    setEstado(p => ({ ...p, errores: [], guardando: true, fallo: null }))
    const { error } = reunionId
      ? await reunionesRepo.updateForm(reunionId, estado.form)
      : await reunionesRepo.insert(estado.form, creadoPor)
    setEstado(p => ({ ...p, guardando: false, fallo: error?.message ?? null }))
    return !error
  }, [estado.form, creadoPor, reunionId])

  const resultado = { form, errores, guardando, fallo, set, guardar }
  return resultado
}
