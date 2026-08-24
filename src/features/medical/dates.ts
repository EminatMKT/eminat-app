// La fecha calendario es transversal (Medical, Research), así que vive en shared/utils/dates.
// Se conserva el nombre `formatDate` porque es el que usa Medical desde siempre.
export { localDate as formatDate } from '@/shared/utils/dates'

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function calcAge(dob: string) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
