import type { Actividad } from '@/features/tasks/types'
import { EMPTY_VALUE } from './constants'
import { dateCells, statusCell } from './cells'
import {
  companyCell,
  responsibleCell,
  titleCell,
} from './text-cells'

function taskRow(act: Actividad, nombrePorId: Record<string, string>): string {
  const content = [titleCell(act), companyCell(act), responsibleCell(act, nombrePorId)]
  content.push(dateCells(act), statusCell(act.estado))
  const html = `<tr>${content.join(EMPTY_VALUE)}</tr>`
  return html
}

export default function buildTableRows(
  acts: Actividad[],
  nombrePorId: Record<string, string>,
): string {
  const rows = acts.map(act => taskRow(act, nombrePorId)).join(EMPTY_VALUE)
  const html = rows
  return html
}

// Builds escaped task rows with shared responsibility labels and printable status styling.
