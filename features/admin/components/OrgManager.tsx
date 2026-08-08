'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { apiSend } from '@/shared/api'
import type { OrgRow } from '@/shared/context/loadAppData'
import TabButton from '@/shared/components/ui/TabButton'
import NewButton from '@/shared/components/ui/NewButton'
import { ORG_CATALOGS, ORG_CATS, type OrgCat } from '../org-catalogs'
import { useOrgCatalog } from '../hooks/useOrgCatalog'
import OrgCard from './OrgCard'
import OrgModal from './OrgModal'

// Sección "Organización" del panel admin: un solo CRUD para los tres catálogos
// (departamentos / equipos / cargos). Qué campos pinta el form y qué bloquea el
// borrado sale de ORG_CATALOGS — agregar un campo no toca este componente.
// `cat` vive en AdminModule (es la tab activa del shell), igual que mktTab en Stratix.
export default function OrgManager({ cat, onCatChange }: { cat: OrgCat; onCatChange: (c: OrgCat) => void }) {
  const { t1, border, reloadOrg, mostrarMensaje } = useApp()
  const { t } = useT()
  const [modal, setModal] = useState<{ row?: OrgRow } | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)
  const { rows, dependents, describe } = useOrgCatalog(cat)

  async function borrar(row: OrgRow) {
    setBorrando(row.id)
    try {
      const { res, result } = await apiSend<{ error?: string }>('DELETE', `/api/admin/org/${cat}/${row.id}`)
      if (!res.ok) mostrarMensaje('error', result.error || t('admin.org.deleteFailed'))
      else { await reloadOrg(); mostrarMensaje('ok', t('admin.org.deleted')) }
    } catch (err: unknown) {
      mostrarMensaje('error', (err instanceof Error ? err.message : '') || t('admin.org.saveNetErr'))
    }
    setBorrando(null)
  }

  return (
    <div>
      {/* Única barra horizontal de la sección — mismo formato que StratixTabNav. */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}` }}>
        {ORG_CATS.map(c => (
          <TabButton key={c} label={t(ORG_CATALOGS[c].labelKey)} active={cat === c}
            onClick={() => { onCatChange(c); setModal(null) }} />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <NewButton label={t(ORG_CATALOGS[cat].newKey)} onClick={() => setModal({})} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 && <div style={{ fontSize: 12, color: t1, opacity: 0.6 }}>{t('admin.org.empty')}</div>}
        {rows.map(row => (
          <OrgCard key={row.id} row={row} detail={describe(row)} deps={dependents(row)}
            deleting={borrando === row.id} onEdit={() => setModal({ row })} onDelete={() => borrar(row)} />
        ))}
      </div>

      {modal && <OrgModal cat={cat} row={modal.row} onClose={() => setModal(null)} />}
    </div>
  )
}
