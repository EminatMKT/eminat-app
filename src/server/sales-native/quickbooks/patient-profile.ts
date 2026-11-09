type Address = Record<string, unknown>

export type PatientContact = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  address?: unknown
}

export function patientAddressText(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const address = value as Address
  // The Portal accepts international addresses without a state or postal code.
  if (['street','city','country'].some(key =>
    typeof address[key] !== 'string' || !(address[key] as string).trim())) return null
  const parts = ['street','line2','city','state','postalCode','country']
    .map(key => address[key]).filter((part): part is string =>
      typeof part === 'string' && !!part.trim())
  const text = parts.join(', ')
  return text.length <= 1000 ? text : null
}

export function patientProfileReadyForPayment(contact: PatientContact): boolean {
  return !!(contact.first_name?.trim() && contact.last_name?.trim() &&
    contact.email?.trim() && contact.phone?.trim() &&
    patientAddressText(contact.address))
}
