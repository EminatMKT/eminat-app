/** The two values `paciente_contactos.tipo` (domain `tipo_contacto`) allows. */
const CONTACT_TYPE = { phone: 'telefono', email: 'email' } as const

export default CONTACT_TYPE

// Mirrors the `tipo_contacto` DOMAIN of `20260824001303_paciente_contactos.sql`; `as const` is what
// lets a contact field's key narrow to exactly these two values.
