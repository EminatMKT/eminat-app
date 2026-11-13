/** The three ways a person can resolve unsaved changes before the editor closes. */
export type Props = {
  onDiscard: () => void
  onSaveAndExit: () => void
  onKeepEditing: () => void
}
