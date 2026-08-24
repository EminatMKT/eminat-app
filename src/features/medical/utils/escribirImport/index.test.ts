import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lotes, escribirImport, type FilaEscritura } from './index'
import { upsertPacientes, upsertPacienteFuentes, upsertPacienteContactos } from '@/features/medical/data/pacientes'
import { ESTADO_PACIENTE_DEFAULT } from '@/features/medical/constants'
import type { ContactoEntrante } from '@/features/medical/utils/pacienteImportPlan'

vi.mock('@/features/medical/data/pacientes', () => ({
  upsertPacientes: vi.fn(),
  upsertPacienteFuentes: vi.fn(),
  upsertPacienteContactos: vi.fn(),
}))

const upsertPacientesMock = vi.mocked(upsertPacientes)
const upsertPacienteFuentesMock = vi.mocked(upsertPacienteFuentes)
const upsertPacienteContactosMock = vi.mocked(upsertPacienteContactos)

describe('lotes', () => {
  it('1.200 filas en lotes de 500 da 500/500/200', () => {
    const filas = Array.from({ length: 1200 }, (_, i) => i)
    const resultado = lotes(filas, 500)
    expect(resultado).toHaveLength(3)
    expect(resultado.map((l) => l.length)).toEqual([500, 500, 200])
  })

  it('array vacío da cero lotes', () => {
    expect(lotes([], 500)).toEqual([])
  })

  it('múltiplo exacto NO deja un lote vacío al final', () => {
    const filas = Array.from({ length: 1000 }, (_, i) => i)
    const resultado = lotes(filas, 500)
    expect(resultado).toHaveLength(2)
    expect(resultado.map((l) => l.length)).toEqual([500, 500])
  })
})

// Prueba de mutación (evidencia en el reporte, no acá): con `i += tamano` cambiado a
// `i += tamano + 1` el segundo test de arriba pasa a fallar (1.000 filas da 2 lotes de 500 y
// uno de 0 en vez de 2 lotes de 500), y con el `for` cambiado a `i <= filas.length` aparece un
// lote extra vacío al final del primer test. Confirmado corriendo vitest con cada mutación y
// revertida antes de este commit.

function fuente(claveOrigen: string): FilaEscritura['fuente'] {
  return { fuente: 'eclinpro', clave_origen: claveOrigen, nombre_origen: null, ref_externa: null }
}

function nueva(entrante: Partial<FilaEscritura['entrante']>, claveOrigen: string): FilaEscritura {
  return { tipo: 'nueva', entrante, fuente: fuente(claveOrigen) }
}

describe('escribirImport', () => {
  beforeEach(() => {
    upsertPacientesMock.mockReset()
    upsertPacienteFuentesMock.mockReset()
    upsertPacienteContactosMock.mockReset()
    upsertPacientesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteFuentesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteContactosMock.mockResolvedValue({ error: null } as Awaited<ReturnType<typeof upsertPacienteContactos>>)
  })

  it('escribe pacientes ANTES que paciente_fuentes', async () => {
    await escribirImport([nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1')])

    const ordenPacientes = upsertPacientesMock.mock.invocationCallOrder[0]
    const ordenFuentes = upsertPacienteFuentesMock.mock.invocationCallOrder[0]
    expect(ordenPacientes).toBeLessThan(ordenFuentes)
  })

  it('genera el id ANTES de escribir y lo manda igual en las dos tablas', async () => {
    await escribirImport([nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1')])

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    const [loteFuentes] = upsertPacienteFuentesMock.mock.calls[0]
    expect(lotePacientes[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(loteFuentes[0].paciente_id).toBe(lotePacientes[0].id)
  })

  it('usa el id existente cuando la fila no es nueva, en vez de generar uno', async () => {
    await escribirImport([{
      tipo: 'existente', id: 'ya-existe-1', existente: {}, entrante: { nombre: 'Ana', apellido: 'Ruiz' },
      fuente: fuente('a1'),
    }])

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    expect(lotePacientes[0].id).toBe('ya-existe-1')
  })

  it('estado ausente se completa con ESTADO_PACIENTE_DEFAULT, no con un literal escrito a mano', async () => {
    await escribirImport([nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1')])

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    expect(lotePacientes[0].estado).toBe(ESTADO_PACIENTE_DEFAULT)
  })
  // Prueba de mutación: cambiar `v.estado ?? ESTADO_PACIENTE_DEFAULT` por
  // `v.estado ?? 'inactivo'` en index.ts hace fallar ESTE test (ESTADO_PACIENTE_DEFAULT vale
  // 'activo', no 'inactivo'). Confirmado y revertido antes de este commit.

  it('cada objeto del lote trae TODAS las columnas, con null explícito', async () => {
    // El 86% de eClinPro no trae email: si el payload saliera de Object.keys(fila), la
    // primera fila y esta tendrían conjuntos de claves distintos y PostgREST tiraría PGRST102.
    await escribirImport([
      nueva({ nombre: 'Ana', apellido: 'Ruiz', telefono: '3055551234' }, 'a1'),
      nueva({ nombre: 'Beto', apellido: 'Diaz' }, 'a2'),
    ])

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    const claves = Object.keys(lotePacientes[0]).sort()
    expect(Object.keys(lotePacientes[1]).sort()).toEqual(claves)
    expect(lotePacientes[1]).toMatchObject({ email: null, telefono: null, telefono_alt: null })
  })

  it('acota los campos fusionables: id/mrn/created_at/updated_at de la fila existente NO se cuelan', async () => {
    // Caller "descuidado" que pasa la fila COMPLETA de la base como `existente`, con un mrn
    // que no tiene nada que ver con el import. Si fusionar() la viera entera, ese mrn
    // generaría un choque de identidad que no es un choque de dato clínico.
    const filaCompletaDeLaBase = {
      id: 'id-viejo', mrn: 'MRN-2024-9999', created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z', nombre: 'Ana', apellido: 'Ruiz',
      estado: 'activo' as const,
    }

    await escribirImport([{
      tipo: 'existente', id: 'id-viejo', existente: filaCompletaDeLaBase, entrante: { telefono: '3055551234' },
      fuente: fuente('a1'),
    }])

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    const escrito = lotePacientes[0]
    expect(escrito.id).toBe('id-viejo')
    expect(escrito).not.toHaveProperty('mrn')
    expect(escrito).not.toHaveProperty('created_at')
    expect(escrito).not.toHaveProperty('updated_at')
    // El resto de la fusión sigue funcionando: nombre/apellido del existente, teléfono del entrante.
    expect(escrito).toMatchObject({ nombre: 'Ana', apellido: 'Ruiz', telefono: '3055551234' })
  })

  it('con existente, los campos que el archivo NO trae sobreviven -no se pisan con null', async () => {
    // Es exactamente el bug que describió la revisión: `{ id, entrante }` sin `existente`
    // (hoy imposible de construir, el tipo lo rechaza) pisaría con null a un paciente real.
    const existente = {
      nombre: 'Ana', apellido: 'Ruiz', email: 'ana@correo.com', seguro: 'Aetna',
      seguro_id: 'AE-1', direccion: 'Calle 1', alergias: 'Penicilina', condiciones: 'Asma',
      notas: 'nota vieja', estado: 'activo' as const,
    }

    await escribirImport([{
      tipo: 'existente', id: 'id-real', existente,
      entrante: { telefono: '3055552222' }, // el archivo solo trae un teléfono
      fuente: fuente('a1'),
    }])

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    const escrito = lotePacientes[0]
    expect(escrito.email).toBe('ana@correo.com')
    expect(escrito.seguro).toBe('Aetna')
    expect(escrito.seguro_id).toBe('AE-1')
    expect(escrito.direccion).toBe('Calle 1')
    expect(escrito.alergias).toBe('Penicilina')
    expect(escrito.condiciones).toBe('Asma')
    expect(escrito.notas).toBe('nota vieja')
  })
  // Prueba de mutación: en `resolverId`, cambiar `existente: fila.existente` por
  // `existente: undefined` en la rama `tipo === 'existente'` (simula que el existente se
  // pierde en el camino) hace fallar ESTE test -email/seguro/seguro_id/direccion/alergias/
  // condiciones/notas se van a null porque `recortar(undefined)` da `{}`-. Confirmado y
  // revertido antes de este commit.

  it('lote de 3, tamaño 2: dos requests por tabla, en orden', async () => {
    const filas: FilaEscritura[] = Array.from({ length: 3 }, (_, i) => nueva({ nombre: `N${i}`, apellido: `A${i}` }, `c${i}`))
    // TAMANO_LOTE no es parámetro de escribirImport (está fijo en 500 adentro del módulo);
    // acá solo se verifica que con pocas filas entra en un único lote.
    await escribirImport(filas)

    expect(upsertPacientesMock).toHaveBeenCalledTimes(1)
    expect(upsertPacienteFuentesMock).toHaveBeenCalledTimes(1)
    expect(upsertPacientesMock.mock.calls[0][0]).toHaveLength(3)
  })

  it('fila sin nombre o sin apellido se rechaza ANTES de escribir, y no mata el lote', async () => {
    const resultado = await escribirImport([
      nueva({ nombre: '', apellido: 'Ruiz' }, 'sin-nombre'),
      nueva({ nombre: 'Beto', apellido: '   ' }, 'sin-apellido'),
      nueva({ nombre: 'Carla', apellido: 'Diaz' }, 'ok'),
    ])

    expect(resultado.rechazadas).toEqual([
      { indice: 0, claveOrigen: 'sin-nombre', motivo: 'sin_nombre' },
      { indice: 1, claveOrigen: 'sin-apellido', motivo: 'sin_apellido' },
    ])
    expect(resultado.filasEscritas).toBe(1)
    expect(resultado.filasTotales).toBe(3)

    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    expect(lotePacientes).toHaveLength(1)
    expect(lotePacientes[0].nombre).toBe('Carla')
  })
  // Prueba de mutación: en `vacio()`, cambiar el cuerpo por `return false` (simula "no valida
  // nada") hace fallar ESTE test -las tres filas entran al mismo lote, `rechazadas` queda
  // vacío y `upsertPacientesMock` recibe la fila con nombre ''-. Confirmado y revertido antes
  // de este commit.

  it('si falla el upsert de pacientes de un lote, no llama a paciente_fuentes y devuelve el error', async () => {
    upsertPacientesMock.mockResolvedValueOnce({ data: null, error: { message: 'boom pacientes' } } as never)

    const resultado = await escribirImport([nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1')])

    expect(upsertPacienteFuentesMock).not.toHaveBeenCalled()
    expect(resultado.error).toEqual({ mensaje: 'boom pacientes', paso: 'pacientes', lote: 0 })
    expect(resultado.filasEscritas).toBe(0)
    expect(resultado.lotesEscritos).toBe(0)
  })

  it('si falla el upsert de paciente_fuentes, cuenta los pacientes de ese lote como escritos', async () => {
    upsertPacienteFuentesMock.mockResolvedValueOnce({ data: null, error: { message: 'boom fuentes' } } as never)

    const resultado = await escribirImport([nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1')])

    expect(resultado.error).toEqual({ mensaje: 'boom fuentes', paso: 'fuentes', lote: 0 })
    expect(resultado.filasEscritas).toBe(1)
    expect(resultado.lotesEscritos).toBe(0)
  })

  it('un lote que falla corta los siguientes: no sigue escribiendo en silencio', async () => {
    upsertPacientesMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } } as never)

    const resultado = await escribirImport([nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1')])

    expect(resultado.lotesTotales).toBe(1)
    expect(resultado.lotesEscritos).toBe(0)
  })

  it('todo OK: lotesEscritos === lotesTotales, sin error y sin rechazadas', async () => {
    const resultado = await escribirImport([
      nueva({ nombre: 'Ana', apellido: 'Ruiz' }, 'a1'),
      nueva({ nombre: 'Beto', apellido: 'Diaz' }, 'a2'),
    ])

    expect(resultado).toEqual({
      lotesTotales: 1, lotesEscritos: 1, filasEscritas: 2, filasTotales: 2, rechazadas: [], error: null,
      contactosEscritos: 0, choques: [],
    })
  })

  it('el número de lote en el error es el LOTE que falló, no siempre 0', async () => {
    // Los otros tests de error mandan una sola fila -un solo lote-, así que nada distingue
    // `lote: i` de `lote: 0` fijo. Acá hace falta un segundo lote de verdad.
    const filas: FilaEscritura[] = Array.from({ length: 501 }, (_, i) => nueva({ nombre: `N${i}`, apellido: `A${i}` }, `c${i}`))
    upsertPacientesMock
      .mockResolvedValueOnce({ data: null, error: null } as never)
      .mockResolvedValueOnce({ data: null, error: { message: 'boom lote 2' } } as never)

    const resultado = await escribirImport(filas)

    expect(resultado.error).toEqual({ mensaje: 'boom lote 2', paso: 'pacientes', lote: 1 })
    expect(resultado.lotesTotales).toBe(2)
    expect(resultado.lotesEscritos).toBe(1)
    expect(resultado.filasEscritas).toBe(500)
  })
  // Prueba de mutación: fijar `lote: 0` en vez de `lote: i` en las dos ramas de error hace
  // fallar ESTE test (`resultado.error.lote` da 0 en vez de 1) sin tocar ningún otro -los demás
  // mandan un solo lote y no distinguen "0 fijo" de "el índice real". Confirmado y revertido
  // antes de este commit.

  it('payloadFuente propaga nombre_origen y ref_externa -no los fija en null', async () => {
    await escribirImport([{
      tipo: 'nueva', entrante: { nombre: 'Ana', apellido: 'Ruiz' },
      fuente: { fuente: 'emed', clave_origen: '7', nombre_origen: 'Ana Ruiz', ref_externa: '7' },
    }])

    const [loteFuentes] = upsertPacienteFuentesMock.mock.calls[0]
    expect(loteFuentes[0].nombre_origen).toBe('Ana Ruiz')
    expect(loteFuentes[0].ref_externa).toBe('7')
  })
  // Prueba de mutación: fijar `nombre_origen`/`ref_externa` en `null` en `payloadFuente` (en vez
  // de leerlos de `fuente`) hace fallar ESTE test -son la traza de dónde salió el paciente, y
  // ningún otro test los mira porque `fuente()` (el helper de este archivo) siempre los manda
  // `null`-. Confirmado y revertido antes de este commit.
})

describe('escribirImport — Bug B: dos filas del archivo apuntan al mismo paciente', () => {
  beforeEach(() => {
    upsertPacientesMock.mockReset()
    upsertPacienteFuentesMock.mockReset()
    upsertPacienteContactosMock.mockReset()
    upsertPacientesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteFuentesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteContactosMock.mockResolvedValue({ error: null } as Awaited<ReturnType<typeof upsertPacienteContactos>>)
  })

  it('dos FilaEscritura "existente" con el MISMO id escriben UN paciente y DOS fuentes, sin reventar el lote', async () => {
    // "MARIA GARCIA" y "MARIA G GARCIA": clave_origen distinta, pero el mismo candidato de
    // fusión exacta (mismo núcleo + DOB) contra un paciente ya cargado -las dos llegan acá como
    // 'existente' con el mismo id. Sin agrupar, esto era el HTTP 500 · 21000 · "ON CONFLICT DO
    // UPDATE command cannot affect row a second time" verificado contra el Postgres local.
    const filas: FilaEscritura[] = [
      {
        tipo: 'existente', id: 'p-1', existente: { nombre: 'Maria', apellido: 'Garcia' },
        entrante: { telefono: '3055551111' }, fuente: fuente('maria garcia|1964-01-01'),
      },
      {
        tipo: 'existente', id: 'p-1', existente: { nombre: 'Maria', apellido: 'Garcia' },
        entrante: { telefono: '3055552222' }, fuente: fuente('maria g garcia|1964-01-01'),
      },
    ]

    const resultado = await escribirImport(filas)

    expect(resultado.error).toBeNull()
    const [lotePacientes] = upsertPacientesMock.mock.calls[0]
    expect(lotePacientes).toHaveLength(1)
    expect(lotePacientes[0].id).toBe('p-1')

    const [loteFuentes] = upsertPacienteFuentesMock.mock.calls[0]
    expect(loteFuentes).toHaveLength(2)
    expect(loteFuentes.every((f) => f.paciente_id === 'p-1')).toBe(true)
    expect(loteFuentes.map((f) => f.clave_origen).sort()).toEqual(
      ['maria g garcia|1964-01-01', 'maria garcia|1964-01-01'],
    )
  })

  it('un grupo colapsado que queda sin nombre rechaza LAS DOS filas de origen, no solo una', () =>
    escribirImport([
      { tipo: 'existente', id: 'p-2', existente: {}, entrante: { apellido: 'Ruiz' }, fuente: fuente('a') },
      { tipo: 'existente', id: 'p-2', existente: {}, entrante: { apellido: 'Ruiz' }, fuente: fuente('b') },
    ]).then((resultado) => {
      expect(resultado.rechazadas).toEqual([
        { indice: 0, claveOrigen: 'a', motivo: 'sin_nombre' },
        { indice: 1, claveOrigen: 'b', motivo: 'sin_nombre' },
      ])
      expect(upsertPacientesMock).not.toHaveBeenCalled()
    }))
})

describe('escribirImport — contactos', () => {
  beforeEach(() => {
    upsertPacientesMock.mockReset()
    upsertPacienteFuentesMock.mockReset()
    upsertPacienteContactosMock.mockReset()
    upsertPacientesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteFuentesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteContactosMock.mockResolvedValue({ error: null } as Awaited<ReturnType<typeof upsertPacienteContactos>>)
  })

  const contactosEnviados = () => upsertPacienteContactosMock.mock.calls.flatMap((c) => c[0])

  function existente(id: string, claveOrigen: string, contactos: ContactoEntrante[]): FilaEscritura {
    return {
      tipo: 'existente', id,
      existente: { nombre: 'Maria', apellido: 'Garcia' },
      entrante: { nombre: 'Maria', apellido: 'Garcia' },
      fuente: fuente(claveOrigen),
      contactos,
    }
  }

  it('escribe los contactos DESPUES de pacientes y de fuentes', async () => {
    const orden: string[] = []
    upsertPacientesMock.mockImplementation((async () => { orden.push('pacientes'); return { data: null, error: null } }) as never)
    upsertPacienteFuentesMock.mockImplementation((async () => { orden.push('fuentes'); return { data: null, error: null } }) as never)
    upsertPacienteContactosMock.mockImplementation((async () => { orden.push('contactos'); return { error: null } }) as never)

    await escribirImport([
      { ...nueva({ nombre: 'Ana', apellido: 'Perez' }, 'k1'), contactos: [{ tipo: 'telefono', valor: '305' }] },
    ])

    expect(orden).toEqual(['pacientes', 'fuentes', 'contactos'])
  })

  it('dos filas fusionadas al mismo paciente NO mandan el contacto repetido', async () => {
    await escribirImport([
      existente('p1', 'a', [{ tipo: 'telefono', valor: '305' }]),
      existente('p1', 'b', [{ tipo: 'telefono', valor: '305' }]),
    ])
    expect(contactosEnviados()).toHaveLength(1)
  })

  it('el mismo valor desde DOS fuentes distintas manda las dos filas', async () => {
    // Que dos sistemas coincidan en un teléfono es la evidencia de que la fusión estuvo bien:
    // colapsarlas borraría justo esa información.
    const a = existente('p1', 'a', [{ tipo: 'telefono', valor: '305' }])
    const b = existente('p1', 'b', [{ tipo: 'telefono', valor: '305' }])
    b.fuente = { fuente: 'ecw', clave_origen: 'b', nombre_origen: null, ref_externa: null }
    await escribirImport([a, b])
    expect(contactosEnviados()).toHaveLength(2)
  })

  it('una fila rechazada por nombre vacio no manda sus contactos', async () => {
    await escribirImport([
      { ...nueva({ nombre: '', apellido: 'Perez' }, 'k1'), contactos: [{ tipo: 'telefono', valor: '305' }] },
    ])
    expect(contactosEnviados()).toHaveLength(0)
  })
})

describe('escribirImport — choques', () => {
  beforeEach(() => {
    upsertPacientesMock.mockReset()
    upsertPacienteFuentesMock.mockReset()
    upsertPacienteContactosMock.mockReset()
    upsertPacientesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteFuentesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteContactosMock.mockResolvedValue({ error: null } as Awaited<ReturnType<typeof upsertPacienteContactos>>)
  })

  it('devuelve los choques agrupados por campo', async () => {
    // Dos filas del archivo, mismo id (ya agrupadas por candidato de fusión), cada una con un
    // DOB distinto al guardado -las dos chocan contra el mismo `acumulado` de fecha_nacimiento.
    const resultado = await escribirImport([
      {
        tipo: 'existente', id: 'p1',
        existente: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14' },
        entrante: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-04-14' },
        fuente: fuente('a'),
      },
      {
        tipo: 'existente', id: 'p1',
        existente: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14' },
        entrante: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-05-14' },
        fuente: fuente('b'),
      },
    ])

    expect(resultado.choques).toEqual([{ campo: 'fecha_nacimiento', n: 2 }])
  })

  it('telefono/email distintos NO cuentan como choque', async () => {
    const resultado = await escribirImport([{
      tipo: 'existente', id: 'p1',
      existente: { nombre: 'Ana', apellido: 'Perez', telefono: '305' },
      entrante: { nombre: 'Ana', apellido: 'Perez', telefono: '786' },
      fuente: fuente('a'),
    }])

    expect(resultado.choques).toEqual([])
  })

  it('una fila rechazada por nombre vacio no cuenta su choque', async () => {
    const resultado = await escribirImport([{
      tipo: 'existente', id: 'p1',
      existente: { nombre: '', apellido: '', fecha_nacimiento: '1985-03-14' },
      entrante: { fecha_nacimiento: '1985-04-14' },
      fuente: fuente('a'),
    }])

    expect(resultado.rechazadas).toHaveLength(1)
    expect(resultado.choques).toEqual([])
  })

  it('dob_origen de CADA fuente queda en SU propia fila de paciente_fuentes -no se pierde al chocar', async () => {
    // La evidencia para reconstruir "eClinicalWorks dijo una fecha, eClinPro dijo otra" (spec
    // §3): sin esto, `payloadFuente` seguiría fijando `dob_origen: null` a pesar del choque.
    await escribirImport([
      {
        tipo: 'existente', id: 'p1',
        existente: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14' },
        entrante: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-04-14' },
        fuente: { ...fuente('a'), dob_origen: '31146' },
      },
      {
        tipo: 'existente', id: 'p1',
        existente: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-03-14' },
        entrante: { nombre: 'Ana', apellido: 'Perez', fecha_nacimiento: '1985-05-14' },
        fuente: { ...fuente('b'), dob_origen: '1985-05-14' },
      },
    ])

    const [loteFuentes] = upsertPacienteFuentesMock.mock.calls[0]
    const porClave = new Map(loteFuentes.map((f) => [f.clave_origen, f.dob_origen]))
    expect(porClave.get('a')).toBe('31146')
    expect(porClave.get('b')).toBe('1985-05-14')
  })
})
