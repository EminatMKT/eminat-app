#!/usr/bin/env python3
"""Centinela de las reglas del repo. Corre antes de cada Write/Edit y BLOQUEA hasta que lo
que se está por guardar pase la checklist.

NO CONTIENE NINGUNA REGLA. El título, el motivo y hasta cómo detectarla viven en
`rules/*.md`; esto es sólo el motor que las lee y las aplica. Cambiar el motivo en el
.md cambia lo que dice el centinela: no hay un segundo lugar donde mantener el texto.

Una regla se vuelve verificable agregándole un bloque dentro de su propia sección:

    <!-- check: block
         pattern: :\\s*any\\b|\\bas\\s+any\\b
         files: .ts,.tsx
         except: /shared/utils/dates
    -->

Una clave por línea; el separador NO puede ser `|` porque los regex lo usan para alternancia.
Dos modos: `block` corta siempre, `contact` corta sólo en archivos NUEVOS —para las reglas que
el propio .md manda migrar "por contacto"; bloquearlas en los 163 archivos que ya tienen
`style` inline haría imposible tocar la mitad del repo—.

Campos: `pattern` (regex que dispara) · `detector` (función de DETECTORES, para lo que un
regex no expresa) · `requires` (sólo evalúa si esto está) · `absent` (dispara si esto NO está)
· `files` y `except` (sufijos y subcadenas de ruta).

`--self-check` corre sus asserts y verifica que toda regla con check tenga su **Motivo**.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RULES = Path(__file__).resolve().parents[2] / 'rules'
CHECK_RE = re.compile(r'<!--\s*check:\s*(.*?)\s*-->', re.DOTALL)
FENCE_RE = re.compile(r'```.*?```', re.DOTALL)


def style_inline(texto, _path):
    """`style={{ }}` con una propiedad CSS real. Pasar un dato como variable CSS es la
    excepción que la regla admite, así que un objeto de puras `--vars` no dispara."""
    for m in re.finditer(r'style=\{\{(.*?)\}\}', texto, re.DOTALL):
        claves = re.findall(r"['\"]?([A-Za-z-]+)['\"]?\s*:", m.group(1))
        if [k for k in claves if not k.startswith('--')]:
            return True
    return False


DETECTORES = {'style_inline': style_inline}


def secciones(md):
    """(título, cuerpo) por cada ## o ###. Sin los bloques ```: un ejemplo escrito en la
    documentación no es una regla, y el README tiene uno."""
    md = FENCE_RE.sub('', md)
    out, titulo, cuerpo = [], None, []
    for linea in md.splitlines():
        if re.match(r'^#{2,3}\s', linea):
            if titulo:
                out.append((titulo, '\n'.join(cuerpo)))
            titulo, cuerpo = re.sub(r'^#+\s*', '', linea).strip(), []
        elif titulo:
            cuerpo.append(linea)
    if titulo:
        out.append((titulo, '\n'.join(cuerpo)))
    return out


def motivo(cuerpo):
    m = re.search(r'\*\*Motivo:?\*\*:?\s*(.+?)(?:\n\n|\Z)', cuerpo, re.DOTALL)
    return ' '.join(m.group(1).split()) if m else ''


def cargar():
    checks = []
    for md in sorted(RULES.glob('*.md')) if RULES.exists() else []:
        for titulo, cuerpo in secciones(md.read_text()):
            for crudo in CHECK_RE.findall(cuerpo):
                lineas = [l.strip() for l in crudo.splitlines() if l.strip()]
                campos = dict(l.split(':', 1) for l in lineas[1:] if ':' in l)
                campos = {k.strip(): v.strip() for k, v in campos.items()}
                checks.append({
                    'solo_nuevos': 'contact' in lineas[0] if lineas else False,
                    'regla': f"{md.name} · {titulo}",
                    'motivo': motivo(cuerpo),
                    'pattern': campos.get('pattern'),
                    'detector': campos.get('detector'),
                    'requires': campos.get('requires'),
                    'absent': campos.get('absent'),
                    'files': [s.strip() for s in campos.get('files', '').split(',') if s.strip()],
                    'except': [s.strip() for s in campos.get('except', '').split(',') if s.strip()],
                })
    return checks


def dispara(chk, path, texto):
    if not ('/src/' in path or path.startswith('src/')):
        return False
    if chk['files'] and not any(path.endswith(f) for f in chk['files']):
        return False
    if any(x in path for x in chk['except']):
        return False
    if chk['requires'] and not re.search(chk['requires'], texto):
        return False
    if chk['detector']:
        fn = DETECTORES.get(chk['detector'])
        return bool(fn and fn(texto, path))
    if chk['absent']:
        return not re.search(chk['absent'], texto)
    return bool(chk['pattern'] and re.search(chk['pattern'], texto))


def revisar(path, texto, es_nuevo=None, checks=None):
    """→ las reglas que este contenido no pasa. Vacío = pasa."""
    checks = cargar() if checks is None else checks
    if es_nuevo is None:
        try:
            es_nuevo = not Path(path).exists()
        except Exception:
            es_nuevo = False
    fallan = []
    for chk in checks:
        try:
            if dispara(chk, path, texto) and (es_nuevo or not chk['solo_nuevos']):
                fallan.append((chk['regla'], chk['motivo']))
        except Exception:
            continue
    return fallan


# ── Antes de un commit o de tocar la base, el repaso de los títulos que aplican ──
ROUTES = [(r'\bgit\s+commit\b', 'proceso.md'),
          (r'supabase|db\s+push|psql|pg_dump', 'base-de-datos.md')]


def staged():
    try:
        out = subprocess.run(['git', 'diff', '--cached', '--name-only'],
                             capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''
    return ("Índice actual (esto es lo que va a entrar al commit):\n"
            + '\n'.join(f"  {l}" for l in out.splitlines())) if out else ''


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    tool = payload.get('tool_name', '')
    ti = payload.get('tool_input', {}) or {}
    path = (ti.get('file_path') or '').replace('\\', '/')

    if tool == 'Bash':
        cmd = ti.get('command') or ''
        for patron, archivo in ROUTES:
            if re.search(patron, cmd) and (RULES / archivo).exists():
                titulos = '\n'.join(f"  · {t}" for t, _ in
                                    secciones((RULES / archivo).read_text()))
                ctx = (f"Repaso de reglas antes de esta acción (el texto completo está en "
                       f"rules/):\n\n— {archivo}\n{titulos}")
                if archivo == 'proceso.md' and (extra := staged()):
                    ctx += '\n\n' + extra
                print(json.dumps({"hookSpecificOutput": {
                    "hookEventName": "PreToolUse", "additionalContext": ctx}}))
                return 0
        return 0

    if tool not in ('Write', 'Edit', 'MultiEdit') or not path:
        return 0
    texto = ti.get('content') or ti.get('new_string') or ''
    for e in ti.get('edits', []) or []:
        texto += '\n' + (e.get('new_string') or '')
    if not texto:
        return 0

    fallan = revisar(path, texto)
    if not fallan:
        return 0

    partes = [f"CHECKLIST DE REGLAS — {path} no pasa {len(fallan)}:\n"]
    for regla, mot in fallan:
        partes.append(f"  ✗ {regla}")
        if mot:
            partes.append(f"    {mot}\n")
    partes.append("Corregí el contenido y volvé a guardar. El texto completo de cada regla "
                  "está en rules/; si de verdad corresponde una excepción, decila en "
                  "voz alta antes de esquivar esto.")
    print('\n'.join(partes), file=sys.stderr)
    return 2


def self_check():
    checks = cargar()
    assert checks, "no se encontró ningún <!-- check: --> en rules/*.md"
    for c in checks:
        assert c['motivo'], f"«{c['regla']}» declara un check pero no tiene **Motivo:**"
    assert not any('README' in c['regla'] for c in checks), \
        "el ejemplo del README se está cargando como check: falta ignorar los bloques ```"

    F = lambda p, t, n=True: revisar(p, t, es_nuevo=n, checks=checks)
    C = 'src/features/x/components/Y/index.tsx'

    assert F(C, "const x: any = 1"), "any debe frenar"
    assert F(C, "foo(bar as any)"), "as any debe frenar (el `|` del regex se perdía al partir)"
    assert not F(C, "const x: Company = 1"), "un tipo que contiene 'any' no"
    assert F(C, "const x: any = 1", False), "any frena aunque el archivo ya exista"

    assert F(C, "d.toISOString().split('T')[0]"), "toISOString debe frenar"
    assert not F('src/shared/utils/dates/index.ts', "d.toISOString().split('T')[0]"), \
        "el módulo que IMPLEMENTA localDate no puede acusarse a sí mismo"

    assert F(C, "import { motion } from 'framer-motion'"), "framer directo debe frenar"
    assert not F('src/shared/motion/index.tsx', "import { motion } from 'framer-motion'")

    assert not F(C, "<div style={{ '--fill': pct }} />"), "una variable CSS es la excepción"
    assert F(C, "<div style={{ padding: 8 }} />"), "una propiedad real frena"
    assert F(C, "<div style={{ '--fill': p, padding: 8 }} />"), "aunque venga con una variable"
    assert not F(C, "<div style={{ padding: 8 }} />", False), \
        "en un archivo que ya existe se migra por contacto: no frena"

    R = 'src/app/api/admin/x/route.ts'
    assert F(R, "export async function POST() { return 1 }"), "route sin guard debe frenar"
    assert not F(R, "export async function POST() { await requireAdmin() }")
    assert not F(R, "const helper = 1"), "un route.ts sin handlers no se juzga"

    assert not F('scripts/x.ts', "const x: any = 1"), "fuera de src/ no se juzga"

    print(f"self-check OK — {len(checks)} checks leídos de rules/")
    return 0


if __name__ == '__main__':
    if '--self-check' in sys.argv:
        sys.exit(self_check())
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)  # un centinela roto NUNCA frena el trabajo
