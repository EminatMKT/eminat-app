import { useT, type I18nKey } from '@/shared/i18n'
import PillToggle from '@/shared/components/ui/PillToggle'
import s from './index.module.css'

type Props = {
  labelKey: I18nKey
  values: string[]
  diff: boolean
  onChooseValue?: (value: string) => void
  selectedValue?: string
}

export default function FieldCompare(props: Props) {
  const {
    labelKey,
    values,
    diff,
    onChooseValue,
    selectedValue,
  } = props
  const { t } = useT()
  if (values.length === 0) return <div className={s.fieldLabel}>{t(labelKey)} — {t('import.merge.noValue')}</div>

  return (
    <>
      <div className={s.fieldLabel}>{t(labelKey)}</div>
      {values.map(v => (
        <PillToggle
          key={v}
          size="sm"
          label={v}
          active={selectedValue === v}
          diff={diff}
          onClick={onChooseValue ? () => onChooseValue(v) : undefined}
        />
      ))}
    </>
  )
}

// FieldCompare draws one label plus one `PillToggle` per value — no cell of its own to draw.
