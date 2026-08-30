import type { ModuleSlug } from './slugs'

export type AreaLeader = { name: string; title: string }
export type SubArea = { name: string; leader: string }

// La ruta sale de modulePath(slug) y el ícono del rail vive en NAV (appShellConfig);
// por eso acá NO hay href ni iconKey (eran redundantes: href = '/'+slug, iconKey = slug).
export type ModuleMeta = {
  slug: ModuleSlug
  name: string
  description: string
  // null = "titular por asignar", que el launchpad pinta como placeholder
  leader: AreaLeader | null
  // lista opcional de sub-áreas con sus responsables (se renderiza en letra chica)
  subAreas?: SubArea[]
}
