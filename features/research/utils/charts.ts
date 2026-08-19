// Agrupadores de las gráficas del dashboard.
//
// Viven acá y no sueltos en el hook por un motivo que ya costó dos bugs: cada barra es
// clickeable y su `key` viaja al filtro, así que el agrupador y el `match` del filtro
// (utils/filters.ts) tienen que decir LO MISMO. Con el agrupamiento inline se desalinearon sin
// que nada avisara: la barra "Sin fase" filtraba a cero, y "Phase 2" devolvía más leads de los
// que la barra contaba. Siendo funciones puras, el test de charts.test.ts puede verificar la
// invariante que los ata: filtrar por el `key` de una barra devuelve EXACTAMENTE su `value`.
//
// Los centinelas de "sin valor" son la otra mitad del arreglo. Un valor vacío no se puede
// expresar con el match por igualdad porque '' significa "filtro apagado", así que el bucket
// vacío necesita un valor propio, y ese valor tiene que ser el mismo de los dos lados.
import type { I18nKey } from '@/shared/i18n'
import { specialtyLabel, NO_SPECIALTY } from './specialty'
import { domainOptions, normalizeDomainValue } from './fields'
import type { Lead } from '../types'

export const NO_STAGE = 'Sin etapa'
export const NO_PHASE = 'Sin fase'

// `key` es el valor con el que se filtra; `name` el que se muestra. Coinciden salvo en
// especialidad, cuya etiqueta va traducida mientras el valor guardado es el literal español.
export type ChartDatum = { key: string; name: string; value: number }

type T = (k: I18nKey) => string

// Cuenta por el valor que devuelve `get`, cayendo al centinela cuando está vacío.
function countBy(leads: Lead[], get: (l: Lead) => string, empty: string): Record<string, number> {
  return leads.reduce((m: Record<string, number>, l) => {
    const k = (get(l) ?? '').toString().trim() || empty
    m[k] = (m[k] || 0) + 1
    return m
  }, {})
}

const byValueDesc = (a: ChartDatum, b: ChartDatum) => b.value - a.value

// Fiel a la tabla: agrupa por el stage REAL de cada lead (migrado o no). Nada se oculta por
// estado de migración; un valor legacy ('Awarded', etc.) aparece tal cual.
export function stageBuckets(leads: Lead[]): ChartDatum[] {
  return Object.entries(countBy(leads, l => l.stage ?? '', NO_STAGE))
    .map(([key, value]) => ({ key, name: key, value })).sort(byValueDesc)
}

// Fases ATÓMICAS: las del dominio que no son una combinación de otras dos. Se deriva en vez de
// listarse para que agregar una fase al dominio no obligue a acordarse de esto. La regla mira
// si las dos mitades de un '/' son a su vez fases del dominio — que es lo que distingue
// 'Phase 1/Phase 2' (combinada) de 'N/A', que lleva una barra adentro y NO es dos cosas.
function atomicPhases(): string[] {
  const dominio = domainOptions('phase') ?? []
  return dominio.filter(p => !(p.includes('/') && p.split('/').every(x => dominio.includes(x.trim()))))
}
export const PHASE_TOKENS = atomicPhases()

// Las fases en las que cuenta un lead. ÚNICA fuente para la gráfica y para el filtro: la barra
// 'Phase 2' y el filtro 'Phase 2' preguntan por esto mismo, así que no pueden discrepar.
//
// Decisión del 18/08: un estudio 'Phase 1/Phase 2' cuenta en LAS DOS barras, porque la pregunta
// real es "cuántos estudios tenemos en fase 2" — que es lo que el filtro ya respondía. Antes la
// barra contaba el valor exacto y el filtro traía también los combinados: la barra decía 7 y
// los KPIs mostraban 12. El costo aceptado es que las barras suman más que el total de estudios.
//
// El legacy numérico del Excel de Royner ('2') se normaliza al canónico para que caiga en la
// misma barra que los demás en vez de abrir una barra propia.
export function phasesOf(lead: Lead): string[] {
  const raw = (lead.phase ?? '').toString().trim()
  if (!raw) return [NO_PHASE]
  const tokens = PHASE_TOKENS.filter(p => raw.includes(p))
  return tokens.length ? tokens : [normalizeDomainValue('phase', raw) || raw]
}

export function phaseBuckets(leads: Lead[]): ChartDatum[] {
  const counts: Record<string, number> = {}
  for (const l of leads) for (const p of phasesOf(l)) counts[p] = (counts[p] || 0) + 1
  return Object.entries(counts).map(([key, value]) => ({ key, name: key, value })).sort(byValueDesc)
}

// Los sin clasificar entran como una barra más en vez de quedar fuera: son ~1 de cada 4
// estudios y esconderlos haría leer el gráfico como si estuviera todo clasificado. Pero van
// SIEMPRE al final aunque sean los más numerosos — rankeados junto a las demás, el gráfico
// proyectado diría que el área más grande de Eminat es "sin clasificar", que no es un área.
export function specialtyBuckets(leads: Lead[], t: T): ChartDatum[] {
  return Object.entries(countBy(leads, l => l.especialidad ?? '', NO_SPECIALTY))
    .map(([key, value]) => ({
      key,
      name: key === NO_SPECIALTY ? t('research.chart.unclassified') : specialtyLabel(key, t),
      value,
    }))
    .sort((a, b) => (a.key === NO_SPECIALTY ? 1 : b.key === NO_SPECIALTY ? -1 : b.value - a.value))
}
