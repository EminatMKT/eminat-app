// .praxis-guard/rules/import-boundaries.mjs
// Convenciones del proyecto: usar los wrappers/singletons, no las libs crudas,
// salvo en las carpetas donde el wrapper/singleton vive (o en server routes).
const IMPORT_RE = /^\s*(?:import\b[^'"]*|export\b[^'"]*from\s*|.*\brequire\s*\()\s*['"]([^'"]+)['"]/;

const BOUNDARIES = [
  { module: '@supabase/supabase-js',
    allowDirs: ['shared/db/', 'app/api/'],            // singleton + server routes (service-role)
    message: 'usá el singleton de shared/db (en cliente); el cliente directo solo en app/api/ o shared/db.' },
  { module: 'framer-motion',
    allowDirs: ['shared/motion/'],                    // solo el wrapper
    message: 'usá los componentes de shared/motion (no Framer Motion directo).' },
];

export default function importBoundaries(content, filePath, _config = {}, _full = {}) {
  const path = String(filePath).replace(/\\/g, '/');
  const out = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = IMPORT_RE.exec(lines[i]);
    if (!m) continue;
    const src = m[1];
    for (const b of BOUNDARIES) {
      if (src !== b.module && !src.startsWith(b.module + '/')) continue;
      if (b.allowDirs.some((d) => path.includes(d))) continue;   // carpeta exenta
      out.push({ rule: 'import-boundaries', line: i + 1, severity: 'warn',
        message: `Import prohibido "${src}": ${b.message}` });
    }
  }
  return out;
}
