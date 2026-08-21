import { describe, it, expect } from 'vitest'
import { parseNombre, claveOrigen, nucleo } from './index'

describe('parseNombre', () => {
  it('eClinicalWorks: APELLIDO,NOMBRE', () => {
    expect(parseNombre('ecw', 'ACEBEY,JONATHAN'))
      .toMatchObject({ nombre: 'Jonathan', apellido: 'Acebey', ambiguo: false })
  })

  it('eClinPro con separador: Nombre - Apellido', () => {
    expect(parseNombre('eclinpro', 'Javier - Andrade'))
      .toMatchObject({ nombre: 'Javier', apellido: 'Andrade', ambiguo: false })
  })

  it('eClinPro sin separador: la INICIAL va al nombre, no al apellido', () => {
    // 312 de las 416 filas sin separador tienen la inicial del segundo nombre en
    // segunda posición. Mandarla al apellido rompe los DOS niveles de matcheo y
    // duplica 149 personas en silencio.
    expect(parseNombre('eclinpro', 'SANDRA V NEGRETE'))
      .toMatchObject({ nombre: 'Sandra V', apellido: 'Negrete', ambiguo: false })
    expect(parseNombre('eclinpro', 'Katia D Triana Perez'))
      .toMatchObject({ nombre: 'Katia D', apellido: 'Triana Perez' })
  })

  it('eClinPro sin separador y sin inicial: ambiguo, no se adivina', () => {
    expect(parseNombre('eclinpro', 'Maria Elena Aranguren'))
      .toMatchObject({ ambiguo: true })
  })

  it('la anotación se saca ANTES de partir, y va a nota', () => {
    // 8 de las 157 anotadas no tienen separador: sin limpiar primero, DUPLICADO
    // ROCHE termina adentro del apellido y la fusión lo promueve como "más completo".
    expect(parseNombre('eclinpro', 'Rodrigo E Betancourt Alvarez DUPLICADO ROCHE'))
      .toMatchObject({ nombre: 'Rodrigo E', apellido: 'Betancourt Alvarez', nota: 'DUPLICADO ROCHE' })
  })

  it('repara el mojibake antes de todo', () => {
    // emed recibe las dos columnas, no una cadena con separador.
    expect(parseNombre('emed', { first: 'Yenni', last: 'PeÃ±a' }))
      .toMatchObject({ nombre: 'Yenni', apellido: 'Peña' })
  })

  it('normaliza la caja', () => {
    expect(parseNombre('ecw', 'GONZALEZ ESPONDA,MARIA')).toMatchObject({ apellido: 'Gonzalez Esponda' })
  })
})

describe('claveOrigen', () => {
  it('eMed usa el Chart# a entero', () => {
    expect(claveOrigen('emed', { chart: '2.0' })).toBe('2')
  })

  it('ecw/eclinpro usan el nombre CRUDO y el DOB CRUDO', () => {
    // Crudo, no interpretado: si saliera del nombre partido o de la fecha resuelta,
    // corregir una de las dos en el paso 4 haría que el import siguiente no
    // reconozca la fila y la duplique.
    expect(claveOrigen('eclinpro', { nombreCrudo: 'Javier - Andrade', dobCrudo: '27958.0' }))
      .toBe('javier andrade|27958.0')
  })

  it('el mojibake NO cambia la clave', () => {
    expect(claveOrigen('emed', { nombreCrudo: 'PeÃ±a', dobCrudo: '1' }))
      .toBe(claveOrigen('emed', { nombreCrudo: 'Peña', dobCrudo: '1' }))
  })

  it('sin DOB, la clave lleva el índice de fila', () => {
    // maitte ponce y teresa cabrera aparecen dos veces sin fecha: sin el índice
    // colapsan en un solo paciente y el resumen miente.
    const a = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', fila: 12 })
    const b = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', fila: 87 })
    expect(a).not.toBe(b)
  })
})

describe('nucleo', () => {
  it('descarta las iniciales y ordena', () => {
    expect(nucleo('Rosa F', 'Martinez Amaro')).toEqual(['amaro', 'martinez', 'rosa'])
    expect(nucleo('Rosa Francisca', 'Martinez Amaro')).toEqual(['amaro', 'francisca', 'martinez', 'rosa'])
  })

  it('es MULTIconjunto: conserva el token repetido', () => {
    // Con conjuntos, Hernandez Hernandez == Hernandez y se fusionaban pre-marcados.
    expect(nucleo('Raul', 'Hernandez Hernandez')).toEqual(['hernandez', 'hernandez', 'raul'])
    expect(nucleo('Raul', 'Hernandez')).toEqual(['hernandez', 'raul'])
  })

  it('no distingue en qué campo cayó cada parte', () => {
    expect(nucleo('Martinez', 'Aida')).toEqual(nucleo('Aida', 'Martinez'))
  })
})
