import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { ESTADO } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { localMonth } from '@/shared/utils/dates'
import { esActividadDeMiembro, totalesProduccion } from '@/features/stratix-mkt/report-filter'
import { reportHtml } from '@/features/stratix-mkt/utils/report-html'
import type { ReporteCriterios } from '@/features/stratix-mkt/types'

// centinela-exime: archivo-extenso@2 — son 56 líneas y la mitad son el armado de los datos
// que la plantilla necesita; sacarlo a otro archivo dejaría dos mitades que sólo se usan
// entre sí.
// El reporte de producción de un miembro y su hoja imprimible. `idsTeam` viene del tablero:
// quién entra en el reporte es la misma decisión de permisos que la de las gráficas, y
// duplicarla acá era la forma de que las dos se desincronizaran.
export function useReporte(idsTeam: string[]) {
  const { usuario, actividades, miembrosPorId } = useApp()
  const { t, intlLocale } = useT()

  // `localMonth()` y no `toISOString().slice(0,7)`: en UTC-5, el 31 a las 20:00 ya es el mes
  // siguiente en UTC, y el reporte abriría en un mes en el que nadie trabajó todavía.
  const [criterios, setCriterios] = useState<ReporteCriterios>({ mes: localMonth(), miembroId: '' })
  const { mes: mesReporte, miembroId: miembroReporte } = criterios

  const setMesReporte = (v: string) => setCriterios(p => ({ ...p, mes: v }))
  const setMiembroReporte = (v: string) => setCriterios(p => ({ ...p, miembroId: v }))

  // Sin elegir a nadie, el reporte es el del primero que se pueda ver: para un no-admin es él
  // mismo, y para el admin el primero del equipo.
  const idRep = miembroReporte || idsTeam[0] || ''
  // El listado incluye lo solicitado; las horas y los días de producción, no (ver
  // `totalesProduccion`: se pagan una vez, a quien las ejecutó). La divergencia entre
  // `actsRep.length` y estas dos cifras es deliberada.
  const actsRep = actividades.filter(a => esActividadDeMiembro(a, idRep, mesReporte || undefined))
  const { horas: totalHorasRep, dias: totalDiasRep } = totalesProduccion(actsRep, idRep)
  const completadasRep = actsRep.filter(a => a.estado === ESTADO.COMPLETADO).length
  const nombreRep = miembrosPorId[idRep] ?? usuario?.nombre ?? '—'

  function handlePrintReport() {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(reportHtml({
      acts: actsRep,
      nombre: nombreRep,
      mes: mesReporte,
      intlLocale,
      completadas: completadasRep,
      horas: totalHorasRep,
      dias: totalDiasRep,
      nombrePorId: miembrosPorId,
      t,
      hoy: new Date(),
    }))
    w.document.close()
  }

  const reporte = {
    mesReporte, setMesReporte, miembroReporte, setMiembroReporte,
    idRep, actsRep, totalHorasRep, totalDiasRep, completadasRep, nombreRep, handlePrintReport,
  }

  return reporte
}
