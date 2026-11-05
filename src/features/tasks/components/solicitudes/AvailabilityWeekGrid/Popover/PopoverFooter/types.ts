/** What PopoverFooter needs: whether save is currently allowed, and the two handlers it wires
 *  to its Button kinds. */
export type PopoverFooterProps = {
  canSave: boolean
  onSave: () => void
  onRemove: () => void
}
