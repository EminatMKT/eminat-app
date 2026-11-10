// Puts a value where a template names its token. Split and join rather than `replace`, so a `$`
// in the value (the hook commands are full of shell variables) is never a replacement pattern.

/** The template with every occurrence of the token replaced by the value. */
export default function fill(template: string, [token, value]: string[]): string {
  const filled = template.split(token).join(value)

  return filled
}
