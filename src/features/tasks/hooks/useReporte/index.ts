import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { ESTADO } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { localMonth } from '@/shared/utils'
import { esActividadDeMiembro } from '@/features/tasks/report-filter'
import { reportHtml } from '@/features/tasks/utils/report-html'
import { nombreDelReporte } from './nombre'
import type { ReporteCriterios } from '@/features/tasks/types'

// centinela-exime: archivo-extenso@2 — son 56 líneas y la mitad son el armado de los datos
// que la plantilla necesita; sacarlo a otro archivo dejaría dos mitades que sólo se usan
// entre sí.
// Reporte de tareas de un miembro y su hoja imprimible. `idsTeam` mantiene la
// selección inicial compatible con el listado de miembros existente.
export function useReporte(idsTeam: string[]) {
  const { usuario, actividades, miembrosPorId, miembrosAsignables, esAdmin } = useApp()
  const { t, intlLocale } = useT()

  // `localMonth()` y no `toISOString().slice(0,7)`: en UTC-5, el 31 a las 20:00 ya es el mes
  // siguiente en UTC, y el reporte abriría en un mes en el que nadie trabajó todavía.
  const [criterios, setCriterios] = useState<ReporteCriterios>({ mes: localMonth(), miembroId: '' })
  const { mes: mesReporte, miembroId: miembroReporte } = criterios

  const setMesReporte = (v: string) => setCriterios(p => ({ ...p, mes: v }))
  const setMiembroReporte = (v: string) => setCriterios(p => ({ ...p, miembroId: v }))

  // Sin elegir a nadie, el reporte es EL PROPIO. Antes caía en `idsTeam[0]`, con el comentario
  // "para un no-admin es él mismo" — cierto mientras un no-admin sólo se veía a sí mismo. Desde
  // que Stratix es un tablero de equipo (31/08), `miembrosAsignables` es el equipo entero para
  // cualquiera, así que TODOS abrían el reporte de la primera persona de la lista.
  const idRep = esAdmin ? (miembroReporte || (idsTeam.includes(usuario?.id ?? '') ? usuario?.id : idsTeam[0]) || '') : (usuario?.id || '')
  // Report lista sólo las tareas asignadas al miembro seleccionado.
  const actsRep = esAdmin ? actividades.filter(a => esActividadDeMiembro(a, idRep, mesReporte || undefined)) : []
  const completadasRep = actsRep.filter(a => a.estado === ESTADO.COMPLETADO).length
  const nombreRep = nombreDelReporte(idRep, miembrosAsignables, miembrosPorId, usuario)

  function handlePrintReport() {
    if (!esAdmin) return
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(reportHtml({
      acts: actsRep,
      nombre: nombreRep,
      mes: mesReporte,
      intlLocale,
      completadas: completadasRep,
      nombrePorId: miembrosPorId,
      t,
      hoy: new Date(),
    }))
    w.document.close()
  }

  const reporte = {
    // `idRep` y no `miembroReporte`: el <select> tiene que mostrar a QUIEN se está reportando.
    // Con el estado crudo decía "Seleccionar" mientras la hoja mostraba otra persona.
    mesReporte, setMesReporte, miembroReporte: idRep, setMiembroReporte,
    idRep, actsRep, completadasRep, nombreRep, handlePrintReport,
  }

  return reporte
}
