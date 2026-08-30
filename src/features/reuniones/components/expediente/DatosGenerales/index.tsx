'use client'
import { Field } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { CamposProps } from '@/features/reuniones/components/expediente/types'
import { TIPO_REUNION } from '@/features/reuniones/constants'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — `Field` se reusa: pone rótulo, ícono y asterisco.
// QUÉ reunión es; la otra mitad vive en `CuandoYDonde`. Título y objetivo van al ancho completo:
// son los dos donde se escribe una frase, y a media columna se cortan.
export default function DatosGenerales({ form, set }: CamposProps) {
  const { empresas } = useApp()
  const { t } = useT()

  // El título usa un área de texto de una fila con `crece`. En una entrada de línea simple el
  // principio se esconde: scrollea y deja ver el final, así que un título largo no se lee.
  // Las empresas son TODAS las activas, no `useApp().marcas`: ese filtro mira
  // `recibe_actividades` —a qué marca se imputa una ACTIVIDAD— y una reunión no lo es.
  const ofrecibles = empresas.filter(e => e.activo)
  return (
    <>
      <div className={s.dos}>
      <Field icon="🏢" label={t('reuniones.campo.empresa')} required>
        <select value={form.empresa} onChange={set('empresa')}>
          <option value="">{t('common.select')}</option>
          {ofrecibles.map(e => <option key={e.id} value={e.codigo ?? ''}>{e.nombre}</option>)}
        </select>
      </Field>

      <Field icon="🗂" label={t('reuniones.campo.tipo')}>
        <select value={form.tipo} onChange={set('tipo')}>
          <option value="">{t('common.select')}</option>
          {TIPO_REUNION.valores.map(v => <option key={v} value={v}>{TIPO_REUNION.label(v, t)}</option>)}
        </select>
      </Field>
      </div>

      <Field label={t('reuniones.campo.titulo')} required grande crece>
        <textarea rows={1} autoFocus value={form.titulo}
          placeholder={t('reuniones.ph.titulo')} onChange={set('titulo')} />
      </Field>

      <Field icon="🎯" label={t('reuniones.campo.objetivo')} grande>
        <textarea rows={3} value={form.objetivo}
          placeholder={t('reuniones.ph.objetivo')} onChange={set('objetivo')} />
      </Field>
    </>
  )
}
