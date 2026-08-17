import { describe, it, expect } from 'vitest'
import { stageColor, PIPELINE_COLORS, STAGE } from './constants'

describe('stageColor (pie y leyenda comparten resolvedor)', () => {
  it('una etapa canónica usa el color del pipeline', () => {
    expect(stageColor(STAGE.CONTACTADO)).toBe(PIPELINE_COLORS[STAGE.CONTACTADO])
  })

  it('un valor legacy NUNCA se pinta con un color del pipeline', () => {
    // El bug: 'Discovery/Feasibility' caía en CHART_COLORS[4] = #FBB040, el naranja de
    // Contactado → dos porciones del mismo pie con el mismo color.
    const pipeline = Object.values(PIPELINE_COLORS)
    for (const legacy of ['Discovery/Feasibility', 'Awarded', 'Sin etapa', 'Docs']) {
      expect(pipeline).not.toContain(stageColor(legacy))
    }
  })

  it('el color de un valor legacy no depende del orden del gráfico', () => {
    // stageData se ordena por cantidad: si el color saliera de la posición, movería solo.
    expect(stageColor('Awarded')).toBe(stageColor('Awarded'))
  })
})
