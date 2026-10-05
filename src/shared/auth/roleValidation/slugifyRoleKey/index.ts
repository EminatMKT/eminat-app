const SLUG = {
  form: 'NFD',
  separator: '_',
  stripped: '',
  prefix: 'rol_',
} as const

function hash(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h }

export default function slugifyRoleKey(label: string): string {
  const base = label.normalize(SLUG.form).replace(/[̀-ͯ]/g, SLUG.stripped) // diacritics
    .toLowerCase().replace(/[^a-z0-9]+/g, SLUG.separator).replace(/^_+|_+$/g, SLUG.stripped)
  const prefixed = SLUG.prefix + (base || Math.abs(hash(label)))
  return /^[a-z]/.test(base) ? base : prefixed
}

// Turns a role's display label into its stored key: diacritics stripped, lowercased, every run of
// other characters collapsed to `_`. A key must start with a letter, so anything else (or an empty
// result) gets a `rol_` prefix, falling back to a hash of the label when nothing survives.
