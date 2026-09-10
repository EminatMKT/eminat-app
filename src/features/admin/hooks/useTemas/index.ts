'use client'
import { useCallback, useEffect, useState } from 'react'
import { temasRepo } from '@/shared/data'
import { useT, type I18nKey } from '@/shared/i18n'
import type { Tema, DatosTema } from '@/features/reuniones/types'

type Estado = { temas: Tema[]; cargando: boolean; error: I18nKey | null }
const VACIO: Estado = { temas: [], cargando: true, error: null }

// El código de Postgres del UNIQUE (empresa, lower(btrim(titulo))).
const UNIQUE_VIOLATION = '23505'

// El mensaje nace del error de la base y no de una validación paralela en el cliente, que se
// desincroniza — mismo criterio que `falloDe`.
const errorKeyForCode = (code?: string): I18nKey =>
  code === UNIQUE_VIOLATION ? 'admin.temas.errorDuplicado' : 'admin.temas.errorGuardar'

export default function useTemas() {
  const [estado, setEstado] = useState<Estado>(VACIO)
  const { t } = useT()

  const recargar = useCallback(async () => {
    const { data, error } = await temasRepo.list()
    setEstado({ temas: data ?? [], cargando: false, error: error ? 'admin.temas.errorCargar' : null })
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  // Las escrituras recargan: lo que se ve es lo que dice la base, no lo que el cliente cree
  // haber escrito. Es lo que hace visible el rechazo de una policy o de un UNIQUE.
  const save = useCallback(async (id: string | null, fila: DatosTema) => {
    const { error } = id
      ? await temasRepo.update(id, { titulo: fila.titulo })
      : await temasRepo.create(fila)
    if (error) { setEstado(p => ({ ...p, error: errorKeyForCode(error.code) })); return false }
    await recargar()
    return true
  }, [recargar])

  const alternarActivo = useCallback(async (tema: Tema) => {
    const { error } = await temasRepo.update(tema.id, { activo: !tema.activo })
    if (error) { setEstado(p => ({ ...p, error: errorKeyForCode(error.code) })); return }
    await recargar()
  }, [recargar])

  // Para que el error de un intento anterior no sobreviva a abrir un modal nuevo.
  const limpiarError = useCallback(() => setEstado(p => ({ ...p, error: null })), [])

  const resultado = { ...estado, mensaje: estado.error ? t(estado.error) : null, recargar, save, alternarActivo, limpiarError }
  return resultado
}

// El catálogo de asuntos: carga la lista, y expone recargar/save/alternarActivo. El error de la
// base (UNIQUE o RLS) llega ya traducido a una clave de i18n en `mensaje`.
