import { EQUALS } from './constants'

/** An option without its `=value`: `--force-with-lease=main` reads as `--force-with-lease`. */
export default function flagName(word: string): string {
  const [name] = word.split(EQUALS)

  return name
}
