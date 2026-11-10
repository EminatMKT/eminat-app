// Splits a shell line into words and operators. It does not run anything and does not
// expand variables: it only needs to see which program each part of the line calls.
// A newline (also `\r\n`) separates commands exactly like `;`, so the leading blank skip
// never eats it; a backslash escapes any character, newline included (line continuation);
// any other character (a stray quote) becomes a one-character word, so the scan never stops
// early and leaves the rest of the line unread.
const PIECE = /[^\S\n]*(?:(&&|\|\||;;?|\|&?|&|\n|\(|\)|>>?|<)|((?:[^\s'"\\;&|<>()]|\\[\s\S]|'[^']*'|"(?:[^"\\]|\\[\s\S])*")+|\S))/gy
const QUOTED = /'([^']*)'|"((?:[^"\\]|\\[\s\S])*)"|\\([\s\S])/g
const ESCAPED = /\\([\s\S])/g
const REDIRECT = /^>>?$/
const TRAILING_BLANK = /\s+$/

const unquote = (word) =>
  word.replace(QUOTED, (_, single, double, escaped) =>
    single ?? (double === undefined ? escaped : double.replace(ESCAPED, '$1')))

const piece = ([, operator, word]) =>
  operator && !REDIRECT.test(operator) ? { operator } : { word: unquote(word ?? operator) }

export default function tokenize(line) {
  return [...line.replace(TRAILING_BLANK, '').matchAll(PIECE)].map(piece)
}
