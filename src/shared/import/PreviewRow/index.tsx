import s from './index.module.css'

// Una fila del preview del archivo (las primeras filas, primeras columnas) — solo para
// confirmar visualmente que el separador y el archivo elegidos son los correctos.
type Props = {
  cells: string[]
}

export default function PreviewRow({ cells }: Props) {
  return (
    <tr className={s.row}>
      {cells.map((v, j) => <td key={j} className={s.cell}>{v}</td>)}
    </tr>
  )
}
