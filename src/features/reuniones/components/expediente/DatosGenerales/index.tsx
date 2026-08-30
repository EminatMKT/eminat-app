'use client'
import { Field } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { CamposProps } from '@/features/reuniones/components/expediente/types'
import { TIPO_REUNION } from '@/features/reuniones/constants'

// Sin `index.module.css`: `Field` ya estiliza el input, el select y el textarea de su campo
// (ver su .module.css). Un archivo de estilos vacío sería ruido, no convención.

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero (20): `Field`
// SÍ se reusa (salida 1) y pone el rótulo y el asterisco. El otro formulario del repo, OrgModal,
// está guiado por `ORG_CATALOGS`: reusarlo pedía inventarle tipos de campo nuevos al catálogo de
// Admin para un único consumidor, y acá los campos no son data-driven. Nace aparte.

// QUÉ reunión es. La otra mitad —cuándo y dónde— vive en `CuandoYDonde`.
export default function DatosGenerales({ form, set }: CamposProps) {
  const { empresas } = useApp()
  const { t } = useT()

  // TODAS las empresas activas, no `useApp().marcas`: ese filtro mira `recibe_actividades`, que
  // gobierna a qué marca se imputa una ACTIVIDAD. Una reunión no es una actividad.
  const ofrecibles = empresas.filter(e => e.activo)

  return (
    <>
      <Field label={t('reuniones.campo.empresa')} required>
        <select value={form.empresa} onChange={set('empresa')}>
          <option value="">{t('common.select')}</option>
          {ofrecibles.map(e => <option key={e.id} value={e.codigo ?? ''}>{e.nombre}</option>)}
        </select>
      </Field>

      <Field label={t('reuniones.campo.tipo')}>
        <select value={form.tipo} onChange={set('tipo')}>
          <option value="">{t('common.select')}</option>
          {TIPO_REUNION.valores.map(v => <option key={v} value={v}>{TIPO_REUNION.label(v, t)}</option>)}
        </select>
      </Field>

      <Field label={t('reuniones.campo.titulo')} required grande>
        <input type="text" value={form.titulo} onChange={set('titulo')} />
      </Field>

      <Field label={t('reuniones.campo.objetivo')} grande>
        <textarea rows={3} value={form.objetivo} onChange={set('objetivo')} />
      </Field>
    </>
  )
}
