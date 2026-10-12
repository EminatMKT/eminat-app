import type { ModuleSlug } from '@/shared/auth/permissions'
import { NAV } from '@/shared/components/shell/appShellConfig'

/** The exact glyph already used in the sidebar, including Tasks and Meetings. */
export default function ModuleIcon({ slug }: { slug: ModuleSlug }) {
  const icon = NAV.find((item) => item.slug === slug)?.icon
  return icon ? <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{icon}</span> : null
}
