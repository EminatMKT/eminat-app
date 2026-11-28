import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'

const NO_OVERRIDES: Partial<Row> = {}

const BASE_ROW: Row = {
  id: 'r1',
  titulo: 'Post',
  empresa: 'EMC',
  estado: 'completado',
  fecha_inicio: '2026-08-17',
  fecha_entrega: null,
}

export default function row(overrides: Partial<Row> = NO_OVERRIDES): Row {
  const merged: Row = { ...BASE_ROW, ...overrides }

  return merged
}

// Builds a valid Row fixture for the useWorkerReport suites, with any field overridden.
