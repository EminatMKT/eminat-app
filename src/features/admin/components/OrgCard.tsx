'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { OrgRow } from '@/shared/context/loadAppData'

// Tarjeta de una fila de catálogo (departamento / equipo / cargo). Agnóstica del
// catálogo: OrgManager le pasa el detalle ya armado y la cuenta de dependientes.
export default function OrgCard({ row, detail, deps, deleting, onEdit, onDelete }: {
  row: OrgRow
  detail: string
  deps: number
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { s1, border, t1, t2, t3, esAdmin } = useApp()
  const { t } = useT()
  // `deps` cuenta actividades, y el contexto solo las trae completas para el rol
  // de sistema `admin` — para cualquier otro vienen filtradas por `responsable_id`.
  // Sin este guard, un rol dinámico con el módulo admin asignado vería un conteo
  // subestimado y el botón habilitado, y el rechazo llegaría recién del 403 de la
  // API. La UI no debe ofrecer lo que el backend va a negar.
  const canDelete = deps === 0 && esAdmin
  return (
    <div data-testid={`org-${row.codigo}`} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {row.icono && <span style={{ fontSize: 14 }}>{row.icono}</span>}
          {row.color && <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.color, flexShrink: 0 }} />}
          <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: t1 }}>{row.nombre}</span>
          <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: t3 }}>{row.codigo}</span>
        </div>
        {detail && <div style={{ fontSize: 11, color: t2, marginTop: 4 }}>{detail}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: t3, whiteSpace: 'nowrap' }}>{t('admin.org.inUse', { n: deps })}</span>
        <button onClick={onEdit} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: `1px solid ${border}`, background: 'transparent', color: t2, cursor: 'pointer' }}>{t('common.edit')}</button>
        <button onClick={onDelete} data-testid={`org-del-${row.codigo}`} disabled={!canDelete || deleting} title={canDelete ? undefined : t('admin.org.inUseTip')}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, border: '1px solid rgba(248,113,113,.30)', background: canDelete ? 'rgba(248,113,113,.10)' : 'transparent', color: canDelete ? '#F87171' : t3, cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.5 }}>
          {deleting ? '...' : t('common.delete')}
        </button>
      </div>
    </div>
  )
}
