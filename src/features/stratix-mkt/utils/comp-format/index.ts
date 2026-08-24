// Reexporta el formato de números compartido con Social, para que los componentes de
// Competencia importen de un único módulo de feature.
//
// Reexportaba también `cardStyle` y `badgeStyle`: los estilos ya no se arman en JS. Las
// tarjetas los tienen en su .module.css y las etiquetas usan shared/components/ui/ColorBadge.
export { fNum } from '@/features/stratix-mkt/utils/social-format'
