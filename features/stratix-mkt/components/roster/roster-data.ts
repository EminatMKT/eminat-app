// Stratix 360 roster (org chart). Driven by STRATIX360_ROSTER below, NOT by
// the contents of the `usuarios` Supabase table. Each entry is rendered
// regardless of whether the person has an account yet; we *enrich* with
// usuarios data (avatar color, online status, real email) when a row exists,
// and show a "Cuenta por crear" placeholder when one doesn't.
//
// Why this matters:
//   - Tasha Palomino and Angie Núñez are team members but their accounts
//     are still pending. With the previous (usuarios-driven) approach they
//     never appeared in Equipo. Now they always do.
//   - Javier Andrade and Jonathan Bula are NOT in this array, so they can
//     never appear here even if their usuarios rows somehow leak through.
//     The isExcludedFromStratix360() helper is an additional safety net for
//     any code path that still reads from usuarios/equipo.

export type RosterColors = {
  s1: string
  border: string
  accent: string
  t1: string
  t2: string
  t3: string
}

export type AreaKey = 'director' | 'diseno' | 'edicion' | 'automatizacion' | 'cuentas'

export type RosterEntry = {
  nombre: string
  area: AreaKey
  leader: boolean
  titulo: string
}

export const AREA_META: Record<Exclude<AreaKey, 'director'>, { label: string; icon: string; color: string }> = {
  diseno: { label: 'Diseño', icon: '🎨', color: '#F472B6' },
  edicion: { label: 'Edición', icon: '🎬', color: '#7C6FF7' },
  automatizacion: { label: 'Automatización · Data & Insight', icon: '⚙️', color: '#A78BFA' },
  cuentas: { label: 'Cuentas / CM', icon: '📲', color: '#60A5FA' },
}

export const STRATIX360_ROSTER: RosterEntry[] = [
  { nombre: 'Freddy Crespín',  area: 'director',       leader: true,  titulo: 'Director de Marketing' },
  { nombre: 'Joselyne Guerrero', area: 'diseno',       leader: true,  titulo: 'Lead Designer' },
  { nombre: 'Arianna Sig-Tú',    area: 'diseno',       leader: false, titulo: 'Graphic Designer' },
  { nombre: 'Angie Núñez',       area: 'diseno',       leader: false, titulo: 'Graphic Designer' },
  { nombre: 'David Falconi',     area: 'edicion',      leader: true,  titulo: 'Lead Editor & Animations' },
  { nombre: 'Bryan Núñez',       area: 'edicion',      leader: false, titulo: 'Video Editor' },
  { nombre: 'Tasha Palomino',    area: 'edicion',      leader: false, titulo: 'Video Editor' },
  { nombre: 'Wagner Dueñas',     area: 'automatizacion', leader: true, titulo: 'Full Stack Developer' },
  { nombre: 'Naomi Panchana',    area: 'cuentas',      leader: true,  titulo: 'Ejecutiva de Cuentas & CM' },
]
