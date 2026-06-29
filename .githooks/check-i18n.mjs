#!/usr/bin/env node
// Pre-commit guard de i18n: revisa SOLO las líneas agregadas (diff staged) de .tsx/.jsx
// y bloquea texto visible nuevo sin interpolar por t(). No toca lo preexistente, así que
// convive con los módulos todavía sin traducir. Escape: `git commit --no-verify`, o marcar
// la línea con un comentario `i18n-ignore` para casos intencionales (marcas, identificadores).
import { execFileSync } from 'node:child_process'

// Marcas / términos propios que NO se traducen aunque aparezcan como texto.
const ALLOW = ['Eminat', 'Stratix', 'EMC', 'SVN', 'ERG', 'VNF', 'Launchpad', 'DEV', 'HIPAA']

// Una línea agregada es sospechosa si introduce: (a) un nodo de texto JSX con letras
// (>Texto<) que no es una interpolación, o (b) un atributo de UI con literal.
const ATTR = /\b(placeholder|title|aria-label|alt)\s*=\s*"([^"{}]*[A-Za-zÀ-ÿ][^"{}]*)"/
const JSX_TEXT = />\s*([A-Za-zÀ-ÿ][^<>{}]*?)\s*</

function isAllowed(text) {
  const trimmed = text.trim()
  if (!trimmed || !/[A-Za-zÀ-ÿ]/.test(trimmed)) return true        // sin letras → no es copy
  if (ALLOW.some(w => trimmed.includes(w))) return true            // marca/term propio
  return false
}

// Recibe el texto del `git diff --cached -U0` y devuelve las violaciones [{text, kind}].
export function check(diff) {
  const out = []
  let file = null
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ b/')) { file = raw.slice(6); continue }
    if (!raw.startsWith('+') || raw.startsWith('+++')) continue
    const line = raw.slice(1)
    if (/i18n-ignore/.test(line)) continue
    if (/<code>/.test(line)) continue                              // identificadores de código
    const attr = line.match(ATTR)
    if (attr && !isAllowed(attr[2])) out.push({ file, kind: attr[1], text: attr[2] })
    const jsx = line.match(JSX_TEXT)
    if (jsx && !line.includes('{t(') && !isAllowed(jsx[1])) out.push({ file, kind: 'jsx', text: jsx[1] })
  }
  return out
}

function main() {
  let diff = ''
  try { diff = execFileSync('git', ['diff', '--cached', '-U0', '--', '*.tsx', '*.jsx'], { encoding: 'utf8' }) } catch { return }
  const viol = check(diff)
  if (!viol.length) return
  console.error('\n\x1b[31m✖ i18n: texto visible nuevo sin interpolar (usá t(\'clave\') o agregá el comentario i18n-ignore)\x1b[0m')
  for (const v of viol.slice(0, 20)) console.error(`  ${v.file ?? ''} → [${v.kind}] "${v.text.slice(0, 60)}"`)
  if (viol.length > 20) console.error(`  …y ${viol.length - 20} más`)
  console.error('\nBypass consciente: git commit --no-verify\n')
  process.exit(1)
}

if (process.argv.includes('--self-test')) {
  const bad = check('+++ b/app/x.tsx\n+        <button>Guardar</button>\n')
  const ok = check('+++ b/app/x.tsx\n+        <button>{t(\'common.save\')}</button>\n')
  const brand = check('+++ b/app/x.tsx\n+        <span>Stratix Solutions</span>\n')
  const code = check('+++ b/app/x.tsx\n+        <code>responsable_ref</code>\n')
  const attr = check('+++ b/app/x.tsx\n+        <input placeholder="Buscar" />\n')
  if (bad.length !== 1) throw new Error('debió flaggear texto JSX nuevo')
  if (ok.length !== 0) throw new Error('no debió flaggear t() interpolado')
  if (brand.length !== 0) throw new Error('no debió flaggear marca permitida')
  if (code.length !== 0) throw new Error('no debió flaggear <code>')
  if (attr.length !== 1) throw new Error('debió flaggear placeholder literal')
  console.log('self-test OK')
} else {
  main()
}
