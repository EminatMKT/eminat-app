import { isModuleSlug } from '@/shared/auth/permissions'
import { ROLE_ERRORS } from '@/shared/errors'
import type { SlugsResult } from '@/shared/auth/roleValidation/types'

export default function validateModuleSlugs(slugs: string[]): SlugsResult {
  const bad = slugs.filter((s) => !isModuleSlug(s))
  if (bad.length) return { ok: false, error: ROLE_ERRORS.invalidModules(bad) }
  return { ok: true }
}

// Checks the module list sent for a role against the module catalog: any slug the catalog does
// not know rejects the whole list, naming the offenders.
