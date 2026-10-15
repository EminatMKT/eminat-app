import type { I18nKey } from '@/shared/i18n'

type Traducir = (key: I18nKey, vars?: Record<string, string>) => string

/** Which of the two fields the dialog is asking for: an exact phrase, or a free note. The two
 *  never both apply (see `Props.notaLabel`), so this is never torn between the two meanings. */
export default function fieldPrompt(
  confirmPhrase: string | undefined,
  confirmPhraseLabel: string | undefined,
  notaLabel: string | undefined,
  t: Traducir,
): string | undefined {
  if (confirmPhrase) {
    const vars = { frase: confirmPhrase }
    return confirmPhraseLabel ?? t('common.confirmPhrase', vars)
  }
  return notaLabel
}
