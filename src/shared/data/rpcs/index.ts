/** Postgres functions called through `supabase.rpc`, named once like `TABLES` in `../tables`. */
const RPCS = {
  setActividadResponsables: 'set_actividad_responsables',
  createMeetActivityForTopic: 'create_meet_activity_for_topic',
  hasModule: 'has_module',
  updateMeetActivity: 'update_meet_activity',
  saveRole: 'save_role',
  patientBirthdayMonths: 'patient_birthday_months',
} as const

export default RPCS

// RPCS names every Postgres function the app calls, so a rename is one line and the
// sibling test proves each name still exists in a migration.
