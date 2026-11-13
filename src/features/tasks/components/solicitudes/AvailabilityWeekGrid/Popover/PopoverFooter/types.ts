/** What PopoverFooter needs: the translated prompt for its guarded delete, whether save is
 *  currently allowed, and the two handlers it wires to its Button kinds. */
export type PopoverFooterProps = {
  confirmationMessage: string
  canSave: boolean
  onSave: () => void
  onRemove: () => void
  onCancel: () => void
}

export type SimpleTranslator = (key: string) => string

export type DeletePromptInput = {
  t: SimpleTranslator
  confirmationMessage: string
  onRemove: () => void
  onClose: () => void
}
