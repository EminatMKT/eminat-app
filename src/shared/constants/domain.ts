import type { I18nKey } from '@/shared/i18n'
// Constantes de dominio de marketing (meses, trimestres, marcas, miembros, etc.).
// Extraídas de AppContext; éste las re-exporta para back-compat.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// La ausencia de filtro. Es un valor de dominio como cualquier otro y por eso vive acá: estaba
// escrito a mano como 'All' en Stratix, 'Todos' en Directorio y 'all' en Accounting — tres
// literales para la misma idea, cada uno comparado por su cuenta. Lo que se MUESTRA sale de
// i18n (`common.all`), nunca este valor.
export const SIN_FILTRO = 'All'

// 'General' es el "sin filtro" del selector de trimestre y por eso encabeza la lista.
export const TRIMESTRE_GENERAL = 'General'
export const TRIMESTRES = [TRIMESTRE_GENERAL, 'Q1', 'Q2', 'Q3', 'Q4']

// Dominios corporativos autorizados para login.
export const DOMINIOS_VALIDOS = ['@eminat.net', '@emc.health', '@vivinegretefoundation.org', '@stratix360.com']

export const MESES_Q: Record<string, string[]> = {
  General: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  Q1: ['Enero', 'Febrero', 'Marzo'],
  Q2: ['Abril', 'Mayo', 'Junio'],
  Q3: ['Julio', 'Agosto', 'Septiembre'],
  Q4: ['Octubre', 'Noviembre', 'Diciembre'],
}

export const mesATrimestre: Record<string, string> = {
  Enero: 'Q1', Febrero: 'Q1', Marzo: 'Q1',
  Abril: 'Q2', Mayo: 'Q2', Junio: 'Q2',
  Julio: 'Q3', Agosto: 'Q3', Septiembre: 'Q3',
  Octubre: 'Q4', Noviembre: 'Q4', Diciembre: 'Q4',
}

// Las marcas ya no viven acá: salen de la tabla `empresas`, que el admin
// administra desde /admin → Organización. Se leen del contexto con
// `useApp().marcas` (las atribuibles) y `useApp().colorMarca` (código → color).

// ÚNICO lugar con los literales del estado de una actividad. Nadie escribe 'Pendiente' a mano:
// el día que el catálogo cambie un valor, un literal suelto no da error de compilación —
// la pantalla simplemente deja de contar esas filas (ver rules/codigo.md).
//
// ⚠️ El valor es el DATO: es lo que está guardado en `actividades.estado` y lo que se compara.
// NO es la etiqueta. Lo que se muestra sale de `estadoLabel()`, que pasa por i18n — si no, con
// la app en inglés el Kanban seguiría rotulando sus columnas "Pendiente".
export const ESTADO = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  POR_APROBAR: 'Por aprobar',
  COMPLETADO: 'Completado',
} as const

export type Estado = (typeof ESTADO)[keyof typeof ESTADO]

// Un solo objeto con todo lo que cuelga de un estado (mismo patrón que STAGE_META en Research):
// agregar un estado es agregar una fila acá, y el compilador reclama las demás.
const ESTADO_META = {
  [ESTADO.PENDIENTE]:   { labelKey: 'stratix.estado.pendiente',  color: '#9494B3' },
  [ESTADO.EN_PROCESO]:  { labelKey: 'stratix.estado.enProceso',  color: '#7C6FF7' },
  [ESTADO.POR_APROBAR]: { labelKey: 'stratix.estado.porAprobar', color: '#FBB040' },
  [ESTADO.COMPLETADO]:  { labelKey: 'stratix.estado.completado', color: '#34D399' },
} satisfies Record<Estado, { labelKey: I18nKey; color: string }>

const ESTADO_ENTRIES = Object.entries(ESTADO_META) as [Estado, { labelKey: I18nKey; color: string }][]

// El orden ES el del tablero: de lo que no empezó a lo terminado.
export const COLUMNAS_KANBAN = ESTADO_ENTRIES.map(([e]) => e)
export const ESTADO_COLORS = Object.fromEntries(ESTADO_ENTRIES.map(([e, m]) => [e, m.color])) as Record<string, string>

// Etiqueta traducida de un estado; cae al valor crudo si llegara uno fuera del catálogo.
export function estadoLabel(estado: string | undefined, t: (k: I18nKey) => string): string {
  const meta = (ESTADO_META as Record<string, { labelKey: I18nKey }>)[estado ?? '']
  return meta ? t(meta.labelKey) : (estado || '—')
}

// `actividades.verificado` es TEXTO con cuatro valores (CHECK en la tabla), no un booleano.
// La ficha lo pintaba como `verificado ? 'Sí' : 'No'`, así que cualquier valor —incluido el
// default 'Pendiente'— se leía como "Sí": la pantalla decía que una tarea recién creada ya
// estaba verificada. Mismo formato que ESTADO: el valor es el dato, la etiqueta sale de i18n.
export const VERIFICADO = {
  PENDIENTE: 'Pendiente',
  POR_APROBAR: 'Por aprobar',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
} as const

export type Verificado = (typeof VERIFICADO)[keyof typeof VERIFICADO]

const VERIFICADO_META = {
  [VERIFICADO.PENDIENTE]:   { labelKey: 'stratix.verificado.pendiente' },
  [VERIFICADO.POR_APROBAR]: { labelKey: 'stratix.verificado.porAprobar' },
  [VERIFICADO.APROBADO]:    { labelKey: 'stratix.verificado.aprobado' },
  [VERIFICADO.RECHAZADO]:   { labelKey: 'stratix.verificado.rechazado' },
} satisfies Record<Verificado, { labelKey: I18nKey }>

export function verificadoLabel(v: string | undefined, t: (k: I18nKey) => string): string {
  const meta = (VERIFICADO_META as Record<string, { labelKey: I18nKey }>)[v ?? '']
  return meta ? t(meta.labelKey) : (v || '—')
}

export const COLORES_AVATAR = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']

export function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
