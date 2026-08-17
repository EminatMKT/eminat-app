import { describe, it, expect } from 'vitest'
import { stageColors, PIPELINE_COLORS, STAGE } from './constants'

// Las 9 etapas legacy que el CHECK de research_leads todavía acepta (migración 20260721225916),
// más el bucket sintético que arma el dashboard para stage null/''. Son las que pueden coexistir
// en un mismo pie hasta que negocio reclasifique los leads viejos.
const LEGACY = [
  'Identificado', 'Calificado', 'Outreach', 'Contacto', 'Discovery/Feasibility',
  'Docs', 'Negociación', 'Awarded', 'Cerrado', 'Sin etapa',
]

describe('stageColors (pie y leyenda comparten un único mapa)', () => {
  it('una etapa canónica conserva el color del pipeline', () => {
    expect(stageColors([STAGE.CONTACTADO])[STAGE.CONTACTADO]).toBe(PIPELINE_COLORS[STAGE.CONTACTADO])
  })

  it('ninguna etapa legacy se pinta con un color del pipeline', () => {
    // El primer bug: 'Discovery/Feasibility' caía en el naranja de Contactado.
    const map = stageColors(LEGACY)
    const pipeline = Object.values(PIPELINE_COLORS)
    for (const name of LEGACY) expect(pipeline).not.toContain(map[name])
  })

  it('dos etapas legacy del mismo gráfico no comparten color', () => {
    // El segundo bug: el hash por nombre mandaba Identificado, Contacto y Docs al mismo violeta.
    // La paleta tiene 6 colores, así que se verifica hasta ese tope — que es lo que puede
    // convivir en un gráfico legible.
    const presentes = LEGACY.slice(0, 6)
    const colores = presentes.map(n => stageColors(presentes)[n])
    expect(new Set(colores).size).toBe(presentes.length)
  })

  it('el color no depende del orden del gráfico', () => {
    // stageData llega ordenado por cantidad: al cargar un lead cambia el orden, no el color.
    const porCantidad = ['Awarded', 'Docs', STAGE.NUEVO, 'Cerrado']
    const alReves = [...porCantidad].reverse()
    for (const name of porCantidad) {
      expect(stageColors(porCantidad)[name]).toBe(stageColors(alReves)[name])
    }
  })
})
