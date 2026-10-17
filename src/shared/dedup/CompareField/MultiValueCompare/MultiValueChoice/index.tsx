import Checkbox from '@/shared/components/ui/Checkbox'

type Props = {
  text: string
  keptIds: string[]
  removableIds: string[]
  excludedIds: string[]
  onToggle: (ids: string[]) => void
  hintText: string
  className?: string
}

const NO_EXTRA: Record<string, never> = {}

/** One distinct value in a multivalued compare: checked by default, disabled (with why) once the
 *  winner already holds it. Pure composition — `Checkbox` draws everything. */
export default function MultiValueChoice(props: Props) {
  const { text, keptIds, removableIds, excludedIds, onToggle, hintText, className } = props
  const kept = keptIds.length > 0
  const dropped = !kept && removableIds.every(id => excludedIds.includes(id))
  const extra: { disabled: true; hint: string } | Record<string, never> = kept
    ? { disabled: true, hint: hintText }
    : NO_EXTRA
  return (
    <Checkbox className={className} checked={!dropped} onChange={() => onToggle(removableIds)} {...extra}>
      {text}
    </Checkbox>
  )
}

// Renders one value of a multivalued compare as a checkbox; the parent decides which values exist.
