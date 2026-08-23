import { describe, it, expect } from 'vitest'
import { parseNombre, claveOrigen, nucleo, candidatos, fusionar } from './index'

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
    // 'ecw', no 'emed': la clave de emed sale del Chart#, así que con 'emed' los dos
    // lados daban '' y el test pasaba sin ejercitar nada.
    expect(claveOrigen('ecw', { nombreCrudo: 'PeÃ±a,Yenni', dobCrudo: '27958.0' }))
      .toBe(claveOrigen('ecw', { nombreCrudo: 'Peña,Yenni', dobCrudo: '27958.0' }))
  })

  it('sin DOB y sin teléfono, la clave lleva el índice de fila (último recurso)', () => {
    // maitte ponce y teresa cabrera aparecen dos veces sin fecha: sin desempate
    // colapsan en un solo paciente y el resumen miente.
    const a = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', fila: 12 })
    const b = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', fila: 87 })
    expect(a).not.toBe(b)
  })

  it('BUG C: sin DOB, el TELÉFONO desempata homónimos -no el índice de fila', () => {
    // El índice depende de la posición en `sanitizedRows`, que el paso 4 compacta al excluir
    // filas: si el operador excluye distinto entre dos sesiones del mismo archivo, la clave
    // cambia y el reimport no reconoce la fila -crea un paciente duplicado. El teléfono no se
    // mueve cuando se excluye OTRA fila, así que es un desempate estable.
    const a = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', telefonoCrudo: '3055551111', fila: 12 })
    const b = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', telefonoCrudo: '3055552222', fila: 12 })
    expect(a).not.toBe(b)
    // Mismo teléfono, índice de fila DISTINTO -sigue dando la MISMA clave: es la fila
    // reconociéndose a sí misma pase lo que pase con el índice.
    const c = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', telefonoCrudo: '3055551111', fila: 12 })
    const d = claveOrigen('eclinpro', { nombreCrudo: 'Maitte - Ponce', dobCrudo: '', telefonoCrudo: '3055551111', fila: 999 })
    expect(c).toBe(d)
  })

  it('manual usa el id del paciente, no nombre+DOB', () => {
    // Un paciente cargado a mano no viene de ningún sistema externo: editarle el
    // nombre no puede cambiarle la clave, o el matcheo deja de reconocerlo.
    expect(claveOrigen('manual', { id: 'uuid-1' })).toBe('uuid-1')
    expect(claveOrigen('manual', { id: 'uuid-1', nombreCrudo: 'Nombre Viejo' }))
      .toBe(claveOrigen('manual', { id: 'uuid-1', nombreCrudo: 'Nombre Nuevo' }))
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

describe('candidatos', () => {
  const rosa = { id: '1', nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13', telefono: '(305) 555-0101', email: 'r@x.com' }

  it('exacta: mismo núcleo y mismo DOB', () => {
    const f = { nombre: 'Ardila de Delgado', apellido: 'Rosa Elvira', fecha_nacimiento: '1964-09-13' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('parcial: el núcleo corto está contenido en el largo', () => {
    const f = { nombre: 'Rosa', apellido: 'Ardila', fecha_nacimiento: '1964-09-13' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'parcial' })
  })

  it('el apellido repetido NO es exacta', () => {
    const raul = { id: '2', nombre: 'Raul', apellido: 'Hernandez', fecha_nacimiento: '1970-01-01' }
    const f = { nombre: 'Raul', apellido: 'Hernandez Hernandez', fecha_nacimiento: '1970-01-01' }
    expect(candidatos(f, [raul])[0]).toMatchObject({ nivel: 'parcial' })
  })

  it('una exacta con teléfono Y email disjuntos baja a parcial', () => {
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: '(786) 555-9999', email: 'otra@y.com' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'parcial' })
  })

  it('AUSENTE no es disjunto: sin contacto, la exacta sigue siendo exacta', () => {
    // El 86% de eClinPro no trae email. Si "sin dato" contara como disjunto, casi
    // ninguna de las 805 exactas quedaría pre-marcada y volverían a ser trabajo
    // manual — justo lo que los dos niveles existen para evitar.
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: null, email: null }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('un solo dato de contacto coincidente alcanza para seguir siendo exacta', () => {
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: '(305) 555-0101', email: 'otra@y.com' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('teléfono presente en los dos lados y email ausente en uno: sigue exacta, no hay evidencia de conflicto', () => {
    // Mixto y no "los dos ausentes" (ya cubierto arriba) ni "los dos presentes": teléfono
    // distinto en los dos lados, pero `f` no trae email. Con `contactoDisjunto` mutado
    // (`||` → `&&` en el guard de "ambos presentes") esto degrada a 'parcial' por falta de
    // evidencia -exactamente lo que la regla existe para no hacer- en vez de por conflicto real.
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: '1964-09-13',
                telefono: '(786) 555-9999' }
    expect(candidatos(f, [rosa])[0]).toMatchObject({ nivel: 'exacta' })
  })

  it('los homónimos con distinto nombre NO son candidatos', () => {
    const laura = { id: '3', nombre: 'Laura', apellido: 'Garcia', fecha_nacimiento: '1989-01-09' }
    const f = { nombre: 'Lucia', apellido: 'Garcia', fecha_nacimiento: '1989-01-09' }
    expect(candidatos(f, [laura])).toEqual([])
  })

  it('sin DOB no hay candidatos', () => {
    const f = { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado', fecha_nacimiento: null }
    expect(candidatos(f, [rosa])).toEqual([])
  })
})

describe('fusionar', () => {
  it('rellena los vacíos y no pisa lo que ya tiene valor', () => {
    const e = { nombre: 'Rosa', apellido: 'Ardila', telefono: '(305) 555-0101', email: null }
    const n = { nombre: 'Rosa', apellido: 'Ardila', telefono: '(786) 555-9999', email: 'r@x.com' }
    const { paciente, choques } = fusionar(e, n)
    expect(paciente.telefono).toBe('(305) 555-0101')
    expect(paciente.email).toBe('r@x.com')
    expect(choques).toContain('telefono')
  })

  it('el nombre gana si su núcleo contiene al otro', () => {
    const { paciente } = fusionar(
      { nombre: 'Rosa', apellido: 'Ardila' },
      { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado' })
    expect(paciente.apellido).toBe('Ardila de Delgado')
  })

  it('el nombre completo del EXISTENTE no se pisa con el entrante más corto', () => {
    // La otra dirección del test de arriba: acá el EXISTENTE es el más completo. Con la
    // condición `&& contieneMultiset(nucleoEntrante, nucleoExistente)` sacada de `fusionar()`,
    // cualquier relación 'contiene' -sin importar de qué lado- toma la rama "gana el entrante",
    // y un registro completo se pisa con uno incompleto.
    const { paciente } = fusionar(
      { nombre: 'Rosa Elvira', apellido: 'Ardila de Delgado' },
      { nombre: 'Rosa', apellido: 'Ardila' })
    expect(paciente.nombre).toBe('Rosa Elvira')
    expect(paciente.apellido).toBe('Ardila de Delgado')
  })

  it('la inicial NO se duplica en los dos campos', () => {
    // Comparando nombre y apellido por separado salía "Maria F" / "F Candia".
    const { paciente } = fusionar(
      { nombre: 'Maria F', apellido: 'Candia' },
      { nombre: 'Maria',   apellido: 'F Candia' })
    expect(paciente.apellido).toBe('Candia')
  })

  it('sin relación de subconjunto gana el existente y se lista el choque', () => {
    const { paciente, choques } = fusionar(
      { nombre: 'Isabella', apellido: 'Castillo Araiz' },
      { nombre: 'Isabella', apellido: 'Castillo Arauz' })
    expect(paciente.apellido).toBe('Castillo Araiz')
    expect(choques).toContain('apellido')
  })

  it('el mismo valor en los dos lados NO es un choque', () => {
    // Sacando `&& valorExistente !== valorEntrante` de `fusionarCampoSimple`, fusionar dos
    // filas con el MISMO teléfono reporta un choque -sería ruido en cada fusión donde el
    // archivo trae el dato repetido, que es el caso más común.
    const e = { nombre: 'Rosa', apellido: 'Ardila', telefono: '(305) 555-0101' }
    const n = { nombre: 'Rosa', apellido: 'Ardila', telefono: '(305) 555-0101' }
    const { choques } = fusionar(e, n)
    expect(choques).not.toContain('telefono')
  })
})
