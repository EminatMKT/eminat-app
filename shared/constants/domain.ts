// Constantes de dominio de marketing (meses, trimestres, marcas, miembros, etc.).
// Extraídas de AppContext; éste las re-exporta para back-compat.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const TRIMESTRES = ['General', 'Q1', 'Q2', 'Q3', 'Q4']

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

export const MARCAS_LIST = [
  { codigo: 'EMC', color: '#60A5FA', label: 'Medical Center' },
  { codigo: 'SVN', color: '#F472B6', label: 'Soy Vivi Negrete' },
  { codigo: 'ERG', color: '#A78BFA', label: 'Research Group' },
  { codigo: 'VNF', color: '#FB923C', label: 'VN Foundation' },
  { codigo: 'PREMIER', color: '#34D399', label: 'Premier' },
  { codigo: 'ORNELLA', color: '#F87171', label: 'Ornella IA' },
  { codigo: 'MENTOR', color: '#FBB040', label: 'Eminat Mentor' },
]

export const ESTADO_COLORS: Record<string, string> = {
  Completado: '#34D399',
  'Por aprobar': '#FBB040',
  'En proceso': '#7C6FF7',
  Pendiente: '#9494B3',
}

export const COLUMNAS_KANBAN = ['Pendiente', 'En proceso', 'Por aprobar', 'Completado']

export const MIEMBROS_REFS: Record<string, string> = {
  DG_Joselyn: 'Joselyn',
  DGA_David: 'David',
  Jonathan_CRM: 'Jonathan',
  DG_Ariana: 'Ariana',
  'CM_ Naomi': 'Naomi',
  EV_Bryan: 'Bryan',
  Coord_MFreddy: 'Freddy',
}

export const SOLICITANTES = [
  { value: 'Coord_MFreddy', label: 'Freddy Crespin — Marketing Director' },
  { value: 'Rafaella', label: 'Rafaella' },
  { value: 'CEO_Vivi', label: 'Vivi Negrete — CEO' },
  { value: 'COO_Javier', label: 'Javier Andrade — COO' },
  { value: 'EMC', label: 'EMC — Medical Center' },
  { value: 'ERG', label: 'ERG — Research Group' },
  { value: 'SVN', label: 'SVN — Soy Vivi Negrete' },
  { value: 'VNF', label: 'VNF — Foundation' },
  { value: 'PREMIER', label: 'PREMIER — Premier' },
]

export const COLORES_AVATAR = ['#7C6FF7', '#34D399', '#F472B6', '#60A5FA', '#FB923C', '#FBB040', '#A78BFA', '#F87171']

export function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function getColorMarca(codigo: string) {
  return MARCAS_LIST.find(m => m.codigo === codigo)?.color || '#7C6FF7'
}
