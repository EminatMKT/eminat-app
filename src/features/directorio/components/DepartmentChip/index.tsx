'use client'
import { DIRECTORIO_DATA } from '@/shared/context/AppContext'
import { SIN_FILTRO } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import s from './index.module.css'

type Props = {
  dep: string
  active: boolean
  onClick: () => void
}

export default function DepartmentChip({ dep, active, onClick }: Props) {
  const { t } = useT()
  // El chip de "sin filtro" no lleva cuenta: contaría el total, que ya está en el título.
  const esTodos = dep === SIN_FILTRO
  const count = esTodos ? null : DIRECTORIO_DATA.filter(m => m.departamento === dep).length

  return (
    <button type="button" onClick={onClick} className={active ? `${s.chip} ${s.activo}` : s.chip}>
      {esTodos ? t('common.all') : dep} {count !== null && <span className={s.cuenta}>{count}</span>}
    </button>
  )
}
