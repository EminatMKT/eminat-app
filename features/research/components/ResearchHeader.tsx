'use client'
import { RESEARCH_THEME } from '../theme'
import { useT } from '@/shared/i18n'

// Solo identidad del módulo. Las acciones (nuevo lead, import, export, PDF) viven en la cabecera
// del panel de Registros: operan sobre esa tabla, no sobre el módulo entero.
export default function ResearchHeader() {
  const { border, t1, t3, accent } = RESEARCH_THEME
  const { t } = useT()
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
    </div>
  )
}
