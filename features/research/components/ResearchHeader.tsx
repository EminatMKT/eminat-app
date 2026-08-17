'use client'
import { RESEARCH_THEME } from '../theme'
import { useT } from '@/shared/i18n'
import { useResearch } from './ResearchContext'
import ToolbarButton from './ToolbarButton'

export default function ResearchHeader({ tab }: { tab: string }) {
  const { border, t1, t3, accent } = RESEARCH_THEME
  const { t } = useT()
  const { openNewLead, setModalImport, handleExport, handlePrint } = useResearch()
  return (
    // Una línea fina cierra el encabezado: separa la identidad del módulo del contenido sin
    // meter otra caja. El bloque de acciones se alinea con el borde derecho de los paneles.
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingBottom: 14, marginBottom: 16, borderBottom: `1px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${accent}14`, border: `1px solid ${accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>🔬</div>
        <div>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1, letterSpacing: '-.02em' }}>Eminat Research Group</div>
          <div style={{ fontSize: 9, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.14em', marginTop: 2 }}>{t('research.header.tagline')}</div>
        </div>
      </div>
      {tab === 'leads' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ToolbarButton primary onClick={openNewLead}>+ {t('research.form.newLead')}</ToolbarButton>
          <ToolbarButton icon="📥" onClick={() => setModalImport(true)}>{t('research.action.import')}</ToolbarButton>
          <ToolbarButton icon="📤" onClick={handleExport}>{t('research.action.export')}</ToolbarButton>
          <ToolbarButton icon="🖨" onClick={handlePrint}>{t('research.action.pdf')}</ToolbarButton>
        </div>
      )}
    </div>
  )
}
