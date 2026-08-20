#!/usr/bin/env python3
"""PreToolUse(Write|Edit): frena el `style` de diseño que componentes.md prohíbe.

La única forma admitida es pasar un DATO como custom property —`style={{ '--pct': … }}`—,
así que se bloquea cualquier objeto `style` cuya primera clave no empiece con `--`.
Se revisa solo lo que se está por escribir, no el archivo entero: los ~200 componentes
viejos se migran por contacto, no de una.
"""
import json
import re
import sys

# style={{ ... : el primer token dentro de las llaves decide si es dato o regla de diseño
STYLE = re.compile(r"style=\{\{\s*(\.\.\.)?\s*(?P<key>'[^']*'|\"[^\"]*\"|[A-Za-z_$][\w$]*)")


def offending(text: str) -> list[str]:
    bad = []
    for m in STYLE.finditer(text or ''):
        key = m.group('key').strip('\'"')
        if not key.startswith('--'):
            bad.append(m.group(0))
    return bad


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    ti = payload.get('tool_input', {})
    path = ti.get('file_path', '')
    if not path.endswith('.tsx') or '/src/' not in path:
        return 0

    text = ti.get('content') or ti.get('new_string') or ''
    bad = offending(text)
    if not bad:
        return 0

    print(
        "REGLA (componentes.md): el atributo `style` está prohibido.\n"
        "Encontrado: " + ' · '.join(sorted(set(bad))[:4]) + "\n"
        "Los estilos van en index.module.css. El único `style` admitido pasa un DATO\n"
        "como variable: style={{ '--pct': `${x}%` }} y el .css hace width: var(--pct).",
        file=sys.stderr,
    )
    return 2


if __name__ == '__main__':
    sys.exit(main())
