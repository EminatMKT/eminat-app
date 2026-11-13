import { NONE } from './constants'
import type { Command, Rule } from './types'

/** Whether a command sets one of the environment variables the rule forbids. */
export default function envHit({ env }: Command, { envNames }: Rule): boolean {
  return env.some((name) => (envNames ?? NONE).includes(name))
}
