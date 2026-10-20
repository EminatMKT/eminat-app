import type { LabelKeys, ValueGetters } from './types'

// The 11 columns `pacienteDedupStrategy.fusionar` can report in `choques` -every entry of
// `CAMPOS_FUSIONABLES` in `escribirImport` except `telefono`/`email`, which `NO_SON_CHOQUE`
// already excludes before they reach a merge screen.
const labelKeys: LabelKeys = {
  nombre: 'med.field.nombre',
  apellido: 'med.field.apellido',
  fecha_nacimiento: 'med.field.fecha_nacimiento',
  genero: 'med.field.genero',
  seguro: 'med.field.seguro',
  seguro_id: 'med.field.seguro_id',
  direccion: 'med.field.direccion',
  estado: 'med.field.estado',
  alergias: 'med.field.alergias',
  condiciones: 'med.field.condiciones',
  notas: 'med.field.notas',
}

// Each getter destructures its own field instead of reading `patient.<field>` so the lookup
// never needs an `as keyof Paciente` cast to turn a runtime field name into a typed access.
const values: ValueGetters = {
  nombre: ({ nombre }) => nombre,
  apellido: ({ apellido }) => apellido,
  fecha_nacimiento: ({ fecha_nacimiento }) => fecha_nacimiento ?? '',
  genero: ({ genero }) => genero ?? '',
  seguro: ({ seguro }) => seguro ?? '',
  seguro_id: ({ seguro_id }) => seguro_id ?? '',
  direccion: ({ direccion }) => direccion ?? '',
  estado: ({ estado }) => estado,
  alergias: ({ alergias }) => alergias ?? '',
  condiciones: ({ condiciones }) => condiciones ?? '',
  notas: ({ notas }) => notas ?? '',
}

/** For each clinical field a patient merge can conflict on: its i18n label key, and how to
 *  read its value as a plain string. Keyed by the same field name `fusionar()` reports. */
const FIELD_MAPS = { labelKeys, values }

export default FIELD_MAPS

// Both maps are keyed by the same field names on purpose: `FIELD_MAPS.labelKeys` has nothing to
// show without a matching `FIELD_MAPS.values` entry, and the sibling test proves they stay in sync.
