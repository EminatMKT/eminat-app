// The refspecs of a `git push`: every operand after the remote, or all of them when the remote
// comes as `--repo` (`git push --repo=origin main` names `main` as a refspec).
import { REPO_FLAGS } from './constants'
import namesFlag from './names-flag'
import operands from './operands'

const namesRepo = (arg: string): boolean => namesFlag(arg, REPO_FLAGS)

/** The refspecs a `git push` with these arguments names. */
export default function refspecs(args: string[]): string[] {
  const named = operands(args)
  const remoteGiven = args.some(namesRepo)

  return remoteGiven ? named : named.slice(1)
}
