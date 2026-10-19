export type ImportResource = 'leads' | 'contacts'
export type ColumnMapping = { column: number; field: string }

const alias: Record<string, string> = {
  name: 'displayName', fullname: 'displayName', nombre: 'displayName',
  nombrecompleto: 'displayName', displayname: 'displayName',
  firstname: 'firstName', nombres: 'firstName', lastname: 'lastName',
  apellido: 'lastName', apellidos: 'lastName', email: 'email', correo: 'email',
  correoelectronico: 'email', mail: 'email', phone: 'phone', telefono: 'phone',
  movil: 'phone', celular: 'phone', street: 'address.street', calle: 'address.street',
  address: 'address.street', direccion: 'address.street', city: 'address.city',
  ciudad: 'address.city', state: 'address.state', provincia: 'address.state',
  zipcode: 'address.postalCode', postalcode: 'address.postalCode',
  codigopostal: 'address.postalCode', country: 'address.country', pais: 'address.country',
  dob: 'dateOfBirth', dateofbirth: 'dateOfBirth', fechanacimiento: 'dateOfBirth',
  insurance: 'insurance', seguro: 'insurance', company: 'companyName',
  companyname: 'companyName', empresa: 'companyName', plan: 'plan',
  product: 'product', producto: 'product', corazonsalud: 'corazonSalud',
  source: 'source', fuente: 'source', nextaction: 'nextAction',
  proximaaccion: 'nextAction', title: 'title', cargo: 'title',
  website: 'website', sitioweb: 'website', industry: 'industry', industria: 'industry',
  description: 'description', descripcion: 'description',
  donotcall: 'doNotCall', donotemail: 'doNotEmail',
  nextfollowupat: 'nextFollowUpAt', proximoseguimiento: 'nextFollowUpAt',
}
const common = [
  'displayName', 'firstName', 'lastName', 'title', 'email', 'phone',
  'address.street', 'address.city', 'address.state', 'address.postalCode',
  'address.country', 'description', 'doNotCall', 'doNotEmail', 'nextAction',
  'nextFollowUpAt', 'dateOfBirth', 'insurance', 'corazonSalud', 'plan', 'product',
]
const allowed: Record<ImportResource, Set<string>> = {
  leads: new Set([...common, 'companyName', 'website', 'industry', 'source']),
  contacts: new Set(common),
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function autoMapImportColumns(headers: string[], resource: ImportResource): ColumnMapping[] {
  const seen = new Set<string>()
  return headers.map((header, column) => {
    const field = alias[normalize(header)]
    if (!field || !allowed[resource].has(field) || seen.has(field)) return null
    seen.add(field)
    return { column, field }
  }).filter((value): value is ColumnMapping => value !== null)
}

function dateValue(value: string) {
  let normalized = value
  const us = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value)
  if (us) normalized = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error('INVALID_DATE')
  const parsed = new Date(`${normalized}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized)
    throw new Error('INVALID_DATE')
  return normalized
}

function boolValue(value: string) {
  const normalized = value.toLowerCase()
  if (['true', '1', 'yes', 'y', 'si', 'sí', 'verdadero', 'x'].includes(normalized)) return true
  if (['false', '0', 'no', 'n', 'falso'].includes(normalized)) return false
  throw new Error('INVALID_BOOLEAN')
}

export function mapImportRow(values: string[], mapping: ColumnMapping[], resource: ImportResource,
  defaultSource?: string): Record<string, unknown> {
  if (mapping.length > 100 || new Set(mapping.map(item => item.column)).size !== mapping.length ||
      new Set(mapping.map(item => item.field)).size !== mapping.length)
    throw new Error('INVALID_MAPPING')
  const result: Record<string, unknown> = {}
  const address: Record<string, string> = {}
  for (const { column, field } of mapping) {
    if (!Number.isInteger(column) || column < 0 || column >= values.length || !allowed[resource].has(field))
      throw new Error('INVALID_MAPPING')
    const raw = String(values[column] ?? '').trim()
    if (!raw) continue
    if (raw === '__ANNIE_FORMULA_CELL__') throw new Error('FORMULA_CELL')
    if (field.startsWith('address.')) { address[field.slice(8)] = raw; continue }
    if (field === 'email') result[field] = raw.toLowerCase()
    else if (field === 'dateOfBirth') result[field] = dateValue(raw)
    else if (field === 'nextFollowUpAt') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(raw))
        result[field] = `${dateValue(raw)}T12:00:00.000Z`
      else if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !Number.isNaN(Date.parse(raw)))
        result[field] = new Date(raw).toISOString()
      else throw new Error('INVALID_DATE')
    } else if (['doNotCall', 'doNotEmail', 'corazonSalud'].includes(field)) result[field] = boolValue(raw)
    else result[field] = raw
  }
  if (Object.keys(address).length) result.address = address
  if (!result.displayName) result.displayName = [result.firstName, result.lastName].filter(Boolean).join(' ').trim()
  if (resource === 'leads' && !result.source && defaultSource) result.source = defaultSource.trim()
  if (typeof result.displayName !== 'string' || !result.displayName || result.displayName.length > 500 ||
      (resource === 'leads' && (typeof result.source !== 'string' || !result.source || result.source.length > 500)))
    throw new Error('VALIDATION_ERROR')
  if (result.email && (typeof result.email !== 'string' || result.email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))) throw new Error('INVALID_EMAIL')
  if (result.phone && (typeof result.phone !== 'string' || result.phone.length > 80))
    throw new Error('INVALID_PHONE')
  return result
}
