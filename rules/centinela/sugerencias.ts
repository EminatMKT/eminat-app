import { markupSustancial } from "./detectores/markup-sustancial.ts"

// Recordatorios que NO bloquean: se inyectan como contexto antes de escribir el archivo.
// El alcance es deliberadamente angosto —sólo componentes NUEVOS con estructura— porque un
// aviso que aparece en cada edición se vuelve invisible a los dos días: es exactamente así
// como el plugin anterior terminó apagado (ver .todo/TODO.md, 25/08/2026).
const GRAFICA = /recharts|<(Bar|Line|Pie|Area|Radar)Chart|dataviz/i

export function sugerencia(path: string, texto: string, esNuevo: boolean): string {
  if (!esNuevo || !path.endsWith(".tsx") || !markupSustancial(texto, path)) return ""

  const skill = GRAFICA.test(texto) ? "dataviz" : "frontend-design"
  const extra = skill === "dataviz"
    ? "El tipo de gráfico y la paleta se deciden ANTES de la primera línea: rehacerlos cuesta el gráfico entero."
    : "Improvisando sale lo genérico — el layout de siempre y la paleta por defecto."

  return [
    `Estás creando un componente visual nuevo (${path.split("/").slice(-2).join("/")}).`,
    `rules/ui.md pide invocar la skill \`${skill}\` ANTES de escribirlo. ${extra}`,
    `Y si lleva color sobre color, \`accessibility\`: el 25/08 los chips de estado daban 1.71:1`,
    `contra el 4.5:1 que pide WCAG AA, y eso se descubrió mirando, no escribiendo.`,
  ].join("\n")
}
