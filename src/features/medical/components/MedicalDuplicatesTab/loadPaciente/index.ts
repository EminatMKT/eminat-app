import { getPaciente, patientContacts, type PatientContactRow } from '@/features/medical/data'
import CONTACT_TYPE from '@/features/medical/constants/contactType'
import type { ContactView, PatientUnderReview } from '../types'

const toView = ({ id, valor }: PatientContactRow): ContactView => ({ id, valor })

const ofType = (rows: PatientContactRow[], type: string): ContactView[] => {
  const matching = rows.filter(({ tipo }) => tipo === type)
  const views = matching.map(toView)
  return views
}

/** One patient by id for the duplicate review, with its contact rows split by type — or a
 *  rejection when either read fails. */
export default async function loadPaciente(id: string): Promise<PatientUnderReview> {
  const reads = [getPaciente(id), patientContacts(id)] as const
  const [patientRead, contactsRead] = await Promise.all(reads)
  if (patientRead.error) throw patientRead.error
  if (contactsRead.error) throw contactsRead.error
  const rows = contactsRead.data ?? []
  const review: PatientUnderReview = {
    paciente: patientRead.data,
    telefono: ofType(rows, CONTACT_TYPE.phone),
    email: ofType(rows, CONTACT_TYPE.email),
  }
  return review
}

// Supabase resolves `{ error }` rather than throwing: rethrowing it is what lets
// `useAbrirPendiente`'s catch mark the pair as failed to open instead of opening nothing.
