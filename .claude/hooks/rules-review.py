#!/usr/bin/env python3
"""PreToolUse: antes de escribir código o de commitear, pone las reglas que aplican adelante.

NO reimplementa ninguna regla. Lee `.claude/rules/*.md` y devuelve los títulos del archivo que
corresponde a lo que se está por hacer, más el hecho que hace falta para decidir (el índice de
git, en el caso del commit). La regla sigue viviendo en un solo lugar: el .md. Si mañana cambia,
este hook la repasa igual sin tocarse.

El criterio de qué archivo aplica está acá y nada más que eso — es ruteo, no contenido.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RULES = Path(__file__).resolve().parent.parent / 'rules'

# qué se está por hacer → qué archivos de regla repasar
ROUTES = [
    (lambda tool, path, cmd: tool == 'Bash' and re.search(r'\bgit\s+commit\b', cmd),
     ['proceso.md']),
    (lambda tool, path, cmd: tool == 'Bash' and re.search(r'supabase|db\s+push|psql', cmd),
     ['base-de-datos.md']),
    (lambda tool, path, cmd: path.endswith('.tsx') and '/src/' in path,
     ['componentes.md', 'arquitectura.md', 'ui.md']),
    (lambda tool, path, cmd: path.endswith('.ts') and '/src/' in path,
     ['codigo.md', 'arquitectura.md']),
]


def headings(name: str) -> str:
    f = RULES / name
    if not f.exists():
        return ''
    titles = [re.sub(r'^#+\s*', '', l).strip()
              for l in f.read_text().splitlines() if re.match(r'^#{2,3}\s', l)]
    return f"— {name}\n" + '\n'.join(f"  · {t}" for t in titles)


def staged() -> str:
    try:
        out = subprocess.run(['git', 'diff', '--cached', '--name-only'],
                             capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''
    if not out:
        return ''
    lista = '\n'.join(f"  {l}" for l in out.splitlines())
    return "Índice actual (esto es lo que va a entrar al commit):\n" + lista


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    tool = payload.get('tool_name', '')
    ti = payload.get('tool_input', {})
    path = ti.get('file_path', '') or ''
    cmd = ti.get('command', '') or ''

    for matches, files in ROUTES:
        try:
            hit = matches(tool, path, cmd)
        except Exception:
            hit = False
        if hit:
            blocks = [b for b in (headings(f) for f in files) if b]
            if not blocks:
                return 0
            extra = staged() if 'proceso.md' in files else ''
            context = ("Repaso de reglas antes de esta acción (el texto completo está en "
                       ".claude/rules/):\n\n" + '\n\n'.join(blocks))
            if extra:
                context += '\n\n' + extra
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": context,
            }}))
            return 0
    return 0


if __name__ == '__main__':
    sys.exit(main())
