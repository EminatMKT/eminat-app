import { patientNames } from '@/features/medical/data'
import summarizePaciente from '../summarizePaciente'

/** Medical's `loadSummaries`: every given patient id → its `nombre apellido`, one batched read. */
export default async function loadSummaries(ids: string[]): Promise<Record<string, string>> {
  const rows = await patientNames(ids)
  const summaries: Record<string, string> = {}
  for (const row of rows) summaries[row.id] = summarizePaciente(row)
  return summaries
}

// Medical's half of the shared list's name contract: the batched read plus the shared summary.
