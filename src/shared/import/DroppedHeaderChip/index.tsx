import s from './index.module.css'

// Una columna del archivo que no mapea a ningún campo, en la lista de "se va a descartar"
// del import. Solo texto — el color de aviso vive en el CSS, no hay lógica que justifique props.
type Props = {
  header: string
}

export default function DroppedHeaderChip({ header }: Props) {
  return <span className={s.chip}>{header}</span>
}
