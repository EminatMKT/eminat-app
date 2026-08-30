'use client'
import { useCallback, useEffect, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { reunionesRepo } from '@/shared/data'
import { ROL_EN_REUNION } from '@/features/reuniones/constants'
import { falloDe } from '@/features/reuniones/utils/falloDe'
import type { Fallo, Participante, ParticipanteNuevo } from '@/features/reuniones/types'

type Estado = { participantes: Participante[]; cargando: boolean; fallo: Fallo | null }
const VACIO: Estado = { participantes: [], cargando: true, fallo: null }

// El orden es la jerarquía de la mesa, no el alfabético que devuelve Postgres (invitado ·
// participante · preside · secretario). Sale de ROL_EN_REUNION, que ya declara el orden bueno.
const porJerarquia = (a: Participante, b: Participante) =>
  ROL_EN_REUNION.valores.indexOf(a.rol_en_reunion) - ROL_EN_REUNION.valores.indexOf(b.rol_en_reunion)

export function useParticipantes(reunionId: string) {
  const [estado, setEstado] = useState<Estado>(VACIO)
  const { participantes, cargando, fallo } = estado

  const recargar = useCallback(async () => {
    const { data, error } = await reunionesRepo.participantes.listByReunion(reunionId)
    setEstado({
      participantes: (data ?? []).sort(porJerarquia),
      cargando: false,
      fallo: error ? falloDe(error) : null,
    })
  }, [reunionId])

  useEffect(() => { void recargar() }, [recargar])

  // Las tres escrituras pasan por acá y recargan: lo que se ve es lo que dice la base, no lo que
  // el cliente cree haber escrito. Es lo que hace visible el rechazo de un CHECK o de un UNIQUE.
  const aplicar = useCallback(async (op: PromiseLike<{ error: PostgrestError | null }>) => {
    const { error } = await op
    setEstado(p => ({ ...p, fallo: error ? falloDe(error) : null }))
    if (!error) await recargar()
  }, [recargar])

  const { insert, update, remove } = reunionesRepo.participantes
  const agregar = useCallback((fila: ParticipanteNuevo) => aplicar(insert(fila)), [aplicar, insert])
  const cambiar = useCallback((id: string, patch: Partial<Participante>) => aplicar(update(id, patch)), [aplicar, update])
  const quitar = useCallback((id: string) => aplicar(remove(id)), [aplicar, remove])

  const resultado = { participantes, cargando, fallo, agregar, cambiar, quitar }
  return resultado
}
