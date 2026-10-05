const DIACRITICS = /[̀-ͯ]/g
const NOTHING = ''
const DECOMPOSED = 'NFD'

// Decomposing splits an accented letter into the letter plus its mark, and the replace keeps the
// letter: that way a search typed without accents finds the label written with them.
const flatten = (raw: string) => raw.normalize(DECOMPOSED).replace(DIACRITICS, NOTHING).toLowerCase()
const asText = (option: unknown) => String(option)

/** What the panel lists and in what order: the options that CONTAIN what was typed —not the ones
 *  that start with it— ignoring case and accents, with `pinned` on top if it survived the filter.
 *  An empty box returns them all: that is what opening shows. `text` reads an object option. */
export default function matches<T>(options: T[], typed: string, pinned?: T, text: (option: T) => string = asText): T[] {
  const needle = flatten(typed.trim())
  const contains = (option: T) => flatten(text(option)).includes(needle)
  const found = needle ? options.filter(contains) : options
  const hasPinned = pinned !== undefined
  const pinnedSurvived = hasPinned && found.includes(pinned)
  if (!pinnedSurvived) return found
  return [pinned, ...found.filter(option => option !== pinned)]
}

// Filters by content and not by prefix: the native `<datalist>` filtered by prefix and a word from
// the middle of a title never found it.
