import type { Pendiente } from '@/shared/dedup/types'

const BASE: Pendiente = {
  item_id_a: 'a',
  item_id_b: 'b',
  nivel: 'exacta',
  detectado_at: '2026-01-01T00:00:00Z',
}

/** A `Pendiente` fixture shared by this module's tests, so the same shape isn't retyped in each. */
export default function pendienteFixture(overrides?: Partial<Pendiente>): Pendiente {
  return { ...BASE, ...overrides }
}

// One fixture, imported everywhere a test needs a `Pendiente`, instead of five test files each
// declaring the same literal pair.
