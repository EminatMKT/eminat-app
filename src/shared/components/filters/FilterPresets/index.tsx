'use client'
// centinela-exime: bloques-similares@2 — busqué un `<select>` compartido antes de dibujar éste:
// `SelectFilter` está atado a un `FilterDef` (deriva opciones de los datos y arrastra la opción
// huérfana) y `CatalogoSelect` a un catálogo META con su `label(v, t)`. Acá las opciones son
// filas de una tabla del usuario. Lo demás sí se reusa: `VistaAcciones` y `NombreVista`.
import { useT } from '@/shared/i18n'
import type { VistaFiltro } from '@/shared/data'
import NombreVista from '../NombreVista'
import VistaAcciones from '../VistaAcciones'
import s from './index.module.css'

type Props = {
  vistas: VistaFiltro[]
  activaId: string
  modificada: boolean
  onAplicar: (id: string) => void
  onGuardar: (nombre: string) => Promise<void>
  onActualizar: (id: string) => Promise<void>
  onRenombrar: (id: string, nombre: string) => Promise<void>
  onBorrar: (id: string) => Promise<void>
  onMarcar: (id: string) => Promise<void>
}

// Las vistas guardadas: elegir una, y las acciones sobre la elegida. Cuál está elegida NO es
// estado de acá: viene de `useFilters`, que lo persiste — con un `useState` local, recargar
// dejaba el desplegable en «Sin vista» mientras en pantalla seguían los filtros de una.
export default function FilterPresets(props: Props) {
  const { vistas, activaId, modificada, onAplicar, onGuardar, ...acciones } = props
  const { t } = useT()
  const nombreActiva = vistas.find(v => v.id === activaId)?.nombre ?? ''
  return (
    <div className={`${s.presets}${activaId ? ` ${s.conVista}` : ''}`}>
      <span className={s.rotulo}>{t('common.filter.viewLabel')}</span>
      <select className={s.select} value={activaId} onChange={e => onAplicar(e.target.value)}>
        <option value="">{t('common.filter.viewsNone')}</option>
        {vistas.map(v => <option key={v.id} value={v.id}>{v.abre_por_defecto ? `★ ${v.nombre}` : v.nombre}</option>)}
      </select>
      {activaId ? (
        <VistaAcciones vistaId={activaId} nombre={nombreActiva} modificada={modificada} {...acciones}>
          <NombreVista rotulo={t(modificada ? 'common.filter.saveAsNew' : 'common.filter.save')} onConfirmar={onGuardar} />
        </VistaAcciones>
      ) : <NombreVista rotulo={t('common.filter.save')} onConfirmar={onGuardar} />}
    </div>
  )
}
