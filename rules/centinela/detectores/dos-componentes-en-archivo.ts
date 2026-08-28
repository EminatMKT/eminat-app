export function dosComponentesEnArchivo(texto: string): boolean {
  // Declaraciones de componente: nombre PascalCase, sea `function` o arrow. No se
  // ancla a columna 0 a propósito — un componente declarado DENTRO de otro es el
  // mismo problema, y además así el detector no depende de dónde caiga el salto
  // de línea. Los handlers no se cuelan: se nombran en camelCase.
  const declaradas =
    (texto.match(/(?:^|[;}\s])(?:export\s+)?(?:default\s+)?function\s+[A-Z]\w*\s*\(/g)?.length ?? 0) +
    (texto.match(/(?:^|[;}\s])(?:export\s+)?const\s+[A-Z]\w*\s*(?::[^=\n]+)?=\s*(?:\([^)]*\)|\w+)\s*=>/g)?.length ?? 0)
  return declaradas >= 2
}
