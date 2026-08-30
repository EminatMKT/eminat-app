'use client'
import { Field } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import type { CamposProps } from '@/features/reuniones/components/expediente/types'
import { MODALIDAD } from '@/features/reuniones/constants'

// Sin `index.module.css`: `Field` ya estiliza el input, el select y el textarea de su campo
// (ver su .module.css). Un archivo de estilos vacío sería ruido, no convención.

// centinela-exime: bloques-similares@2 — es la otra mitad del formulario de `DatosGenerales` y
// reusa lo mismo: `Field`. Se separó por largo y porque son dos preguntas distintas —qué reunión
// es, y cuándo y dónde—, no porque el markup sea otro.

// CUÁNDO y DÓNDE. La otra mitad —qué reunión es— vive en `DatosGenerales`.
export default function CuandoYDonde({ form, set }: CamposProps) {
  const { t } = useT()

  return (
    <>
      <Field label={t('reuniones.campo.fecha')} required>
        <input type="date" value={form.fecha} onChange={set('fecha')} />
      </Field>

      <Field label={t('reuniones.campo.modalidad')} required>
        <select value={form.modalidad} onChange={set('modalidad')}>
          <option value="">{t('common.select')}</option>
          {MODALIDAD.valores.map(v => <option key={v} value={v}>{MODALIDAD.label(v, t)}</option>)}
        </select>
      </Field>

      <Field label={t('reuniones.campo.horaInicio')}>
        <input type="time" value={form.hora_inicio} onChange={set('hora_inicio')} />
      </Field>

      <Field label={t('reuniones.campo.horaFin')}>
        <input type="time" value={form.hora_fin} onChange={set('hora_fin')} />
      </Field>

      <Field label={t('reuniones.campo.lugar')} grande>
        <input type="text" value={form.lugar} onChange={set('lugar')} />
      </Field>
    </>
  )
}
