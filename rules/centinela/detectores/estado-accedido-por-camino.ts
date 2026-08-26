export function estadoAccedidoPorCamino(texto: string): boolean {
  // Un objeto de estado leído campo por campo (`criterios.busqueda`, `criterios.departamento`)
  // en vez de desestructurado una vez. Dispara con DOS propiedades distintas del mismo estado:
  // con una sola no se distingue de `actividades.length`, que es un array y está bien.
  // No cuentan las llamadas a método (`actividades.map(`): ahí el punto no lee un campo.
  const estados = [...texto.matchAll(/const\s*\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*useState/g)].map((m) => m[1])
  for (const nombre of estados) {
    const props = new Set<string>()
    for (const m of texto.matchAll(new RegExp(`\\b${nombre}\\.(\\w+)\\s*(.?)`, "g"))) {
      if (m[2] !== "(") props.add(m[1])
    }
    if (props.size >= 2) return true
  }
  return false
}
