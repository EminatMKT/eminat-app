import { describe, it, expect } from 'vitest'
import { stageColors, PIPELINE_COLORS, PIPELINE_COLS, STAGE } from './index'

const EN_COMUNICACION_LITERAL = 'En comunicación'
const NEXT_STAGE_OFFSET = 1

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

  it('ninguna etapa del mismo gráfico comparte color, ni en el peor caso', () => {
    // El segundo bug: el hash mandaba Identificado, Contacto y Docs al mismo violeta. El tercero:
    // el módulo sobre una paleta de 6 hacía colisionar de a pares al pasar de 6 legacy. Por eso
    // se verifica el PEOR caso real y completo (las 10 legacy + las 5 canónicas), no un recorte
    // del tamaño de la paleta — ese tope era una propiedad de la paleta, no de los datos.
    const todas = [...LEGACY, ...Object.keys(PIPELINE_COLORS)]
    const map = stageColors(todas)
    expect(new Set(todas.map(n => map[n])).size).toBe(todas.length)
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

describe('the En comunicación stage sits between Contactado and Ganado', () => {
  it('exists with the exact literal stored in research_leads.stage', () => {
    expect(STAGE.EN_COMUNICACION).toBe(EN_COMUNICACION_LITERAL)
  })

  it('the pipeline orders it between Contactado and Ganado', () => {
    const index = PIPELINE_COLS.indexOf(STAGE.EN_COMUNICACION)
    expect(index).toBe(PIPELINE_COLS.indexOf(STAGE.CONTACTADO) + NEXT_STAGE_OFFSET)
    expect(index).toBe(PIPELINE_COLS.indexOf(STAGE.GANADO) - NEXT_STAGE_OFFSET)
  })
})
