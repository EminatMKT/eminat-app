#!/usr/bin/env python3
"""PreToolUse(Bash): frena los dos errores de staging que .claude/rules/proceso.md prohíbe.

1. `git add -A` / `git add .` — la regla dice stagear por ruta.
2. `git commit` con el índice mezclado. `git mv` y `git rm` stagean solos, así que un
   commit posterior se lleva trabajo de otro paso aunque el `git add` haya nombrado dos
   archivos. Pasó cuatro veces el 20/08/2026.

Escape: prefijar MIXTO=1 al comando cuando la mezcla es deliberada.
"""
import json
import re
import subprocess
import sys

ADD_ALL = re.compile(r'\bgit\s+add\s+(-A\b|--all\b|\.(\s|$))')
COMMIT = re.compile(r'\bgit\s+commit\b')


def area(path: str) -> str | None:
    """Agrupa un archivo en la unidad de trabajo a la que pertenece."""
    # Las claves de i18n acompañan a cualquier cambio de UI, y .todo no es código.
    if path.startswith('src/shared/i18n/locales/') or path.startswith('.todo/'):
        return None
    if path.startswith('.claude/rules/'):
        return 'reglas'
    m = re.match(r'src/features/([^/]+)/', path)
    if m:
        return f'feature:{m.group(1)}'
    return None


def main() -> int:
    try:
        cmd = json.load(sys.stdin).get('tool_input', {}).get('command', '')
    except Exception:
        return 0

    if 'MIXTO=1' in cmd:
        return 0

    if ADD_ALL.search(cmd):
        print(
            "REGLA (proceso.md): nada de `git add -A` ni `git add .` — se stagea por ruta.\n"
            "  git add ruta/uno.ts ruta/dos.css && git status -s",
            file=sys.stderr,
        )
        return 2

    if COMMIT.search(cmd):
        try:
            staged = subprocess.run(['git', 'diff', '--cached', '--name-only'],
                                    capture_output=True, text=True, timeout=10).stdout.split()
        except Exception:
            return 0
        areas = {a for a in (area(p) for p in staged) if a}
        if len(areas) > 1:
            print(
                "REGLA (proceso.md): el índice mezcla " + ', '.join(sorted(areas)) + ".\n"
                "Son commits distintos. Archivos stageados:\n  " + "\n  ".join(staged) + "\n\n"
                "Sacá lo que no va (`git restore --staged <ruta>`) y commiteá por separado.\n"
                "Si de verdad es una sola unidad, repetí el comando con MIXTO=1 adelante.",
                file=sys.stderr,
            )
            return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
