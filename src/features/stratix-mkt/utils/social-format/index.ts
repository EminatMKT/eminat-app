// Formato corto de números (12.8K / 1.2M). Compartido por Social y Competencia.
//
// Tenía además `cardStyle` y `badgeStyle`, que devolvían objetos de estilos: los estilos ya no
// se arman en JS (ver componentes.md). Las tarjetas los tienen en su .module.css y las
// etiquetas usan shared/components/ui/ColorBadge.
export const fNum = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)
