'use client'
import { useT, type I18nKey } from '@/shared/i18n'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero. El único
// `<select>` compartido es `SelectFilter`, y responde a otra cosa: deriva sus opciones de los
// DATOS presentes y arrastra la opción huérfana de un filtro recordado. Acá las opciones son un
// catálogo fijo. No es "agregarle un prop": habría que sacarle el `FilterDef` primero.
// centinela-exime: select-con-default@2 — no ofrece opción en blanco porque EDITA un valor que
// ya existe: el catálogo es NOT NULL con DEFAULT en la base, así que nunca llega vacío. El techo
// está dicho: si algún día hace falta ofrecerlo en blanco, eso es un prop `placeholder`, no
// pasarle `''` a éste.

/** Lo que devuelve `catalogoMeta`, visto desde afuera: la lista y cómo se traduce. */
type Catalogo<V extends string> = {
  valores: V[]
  label: (v: string | undefined, t: (k: I18nKey) => string) => string
}

type Props<V extends string> = {
  catalogo: Catalogo<V>
  valor: V
  /** Cómo se llama el control. Va de `aria-label` porque estos selects viven en filas que se
   *  leen de corrido y no tienen rótulo visible: sin esto son un desplegable sin nombre. */
  etiqueta: string
  onChange: (v: V) => void
  className?: string
}

// Un `<select>` sobre un catálogo META. El único `as` vive acá adentro y no en cada consumidor:
// `e.target.value` es `string` para el DOM, y el genérico lo devuelve a su unión.
export default function CatalogoSelect<V extends string>(props: Props<V>) {
  const { catalogo, valor, etiqueta, onChange, className } = props
  const { t } = useT()

  return (
    <select className={className} aria-label={etiqueta} value={valor}
      onChange={e => onChange(e.target.value as V)}>
      {catalogo.valores.map(v => <option key={v} value={v}>{catalogo.label(v, t)}</option>)}
    </select>
  )
}
