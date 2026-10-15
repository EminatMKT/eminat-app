import pendienteFixture from '../pendienteFixture'
import type { Args } from '../useDecidirPendiente/types'

type Item = { id: string; telefono: string }

/** An open pair with both sides loaded and every callback inert, for `useDecidirPendiente`'s
 *  tests: each one overrides only the argument it observes. */
export default function decidirArgsFixture(overrides: Partial<Args<Item>>): Args<Item> {
  const abierto = pendienteFixture()
  const base: Args<Item> = {
    entidad: 'pacientes',
    abierto,
    itemA: { id: abierto.item_id_a, telefono: '555-0001' },
    itemB: { id: abierto.item_id_b, telefono: '555-0002' },
    elecciones: {},
    construirValoresFinales: ({ telefono }) => ({ telefono }),
    alDecidir: () => {},
  }
  const args = { ...base, ...overrides }
  return args
}

// Shared by the two `useDecidirPendiente` test files so neither retypes the seven arguments.
