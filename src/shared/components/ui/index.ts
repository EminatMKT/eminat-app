// Barrel de la UI compartida. Sólo re-exporta.
//
// Cada componente es un archivo con UN `export default` —su carpeta ya dice cómo se llama— y
// acá se le pone el nombre público. El consumidor importa desestructurando:
//
//     import { Modal, Field, Button } from '@/shared/components/ui'
//
// Por qué el default adentro y el nombre acá: el default obliga a que el archivo declare UNA
// cosa —no hay dónde colgar la segunda—, y el barrel es el único lugar donde ese nombre se
// escribe, así que renombrar un componente es cambiar una línea y no buscar el string por todo
// el repo. Ver rules/codigo.md · "Un archivo exporta una cosa por default".
export { default as BrandChip } from './BrandChip'
export { default as Button } from './Button'
export { default as CargandoVista } from './CargandoVista'
export { default as CatalogoSelect } from './CatalogoSelect'
export { default as ColorBadge } from './ColorBadge'
export { default as ConfirmModal } from './ConfirmModal'
export { default as ErrorList } from './ErrorList'
export { default as Field } from './Field'
export { default as FilaLista } from './FilaLista'
export { default as FilterBar } from './FilterBar'
export { default as ListToolbar } from './ListToolbar'
export { default as Modal } from './Modal'
export { default as PillToggle } from './PillToggle'
export { default as RowMenu } from './RowMenu'
export { default as SelectFilter } from './SelectFilter'
export { default as StatBox } from './StatBox'
export { default as TabBar } from './TabBar'
export { default as TabButton } from './TabButton'
export { default as WarningCallout } from './WarningCallout'
