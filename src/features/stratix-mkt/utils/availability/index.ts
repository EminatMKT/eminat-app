// Carga de trabajo de una persona, para la vista de disponibilidad.
//
// Vivía dentro de MemberAvailabilityCard, mezclada con el markup. Acá se puede testear sin
// montar nada, que es la mitad del motivo; la otra es que son horas — y lo que cuenta horas
// lleva test (ver .claude/rules/codigo.md).

export const HORAS_SEMANALES = 40

// Por encima de este % de ocupación la persona se muestra como no disponible.
const UMBRAL_OCUPADA = 75

export type Carga = {
  horasOcupadas: number
  horasLibres: number
  pctOcupado: number
  disponible: boolean
}

export function cargaDe(tareas: { horas?: number | string | null }[]): Carga {
  const horasOcupadas = Math.round(tareas.reduce((acc, t) => acc + (Number(t.horas) || 0), 0) * 10) / 10
  const pctOcupado = Math.min((horasOcupadas / HORAS_SEMANALES) * 100, 100)
  return {
    horasOcupadas,
    horasLibres: Math.max(HORAS_SEMANALES - horasOcupadas, 0),
    pctOcupado,
    disponible: pctOcupado < UMBRAL_OCUPADA,
  }
}

// Heurística de la agenda del día: no hay horarios reales cargados todavía, así que se deduce
// de la ocupación semanal. Muy cargada ⇒ el día entero ocupado; medianamente ⇒ solo el centro
// del día, que es cuando la gente efectivamente produce.
export function slotOcupado(pctOcupado: number, hora: number): boolean {
  if (pctOcupado > 85) return true
  return pctOcupado > 60 && hora >= 10 && hora <= 14
}
