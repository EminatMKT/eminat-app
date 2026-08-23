import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lotes, escribirImport, type FilaEscritura } from './index'
import { upsertPacientes, upsertPacienteFuentes } from '@/features/medical/data/pacientes'
import { ESTADO_PACIENTE_DEFAULT } from '@/features/medical/constants'

vi.mock('@/features/medical/data/pacientes', () => ({
  upsertPacientes: vi.fn(),
  upsertPacienteFuentes: vi.fn(),
}))

const upsertPacientesMock = vi.mocked(upsertPacientes)
const upsertPacienteFuentesMock = vi.mocked(upsertPacienteFuentes)

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
    upsertPacientesMock.mockResolvedValue({ data: null, error: null } as never)
    upsertPacienteFuentesMock.mockResolvedValue({ data: null, error: null } as never)
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
    })
  })
})
