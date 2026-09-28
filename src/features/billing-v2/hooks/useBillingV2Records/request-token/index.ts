/** A gate for requests that may answer out of order: claiming returns the test that says
 *  whether this answer is still the one being waited for. */
export default function requestToken() {
  const state = { turn: 0 }
  const claim = () => {
    state.turn += 1
    const mine = state.turn
    return () => state.turn === mine
  }
  const cancel = () => { state.turn += 1 }
  const token = { claim, cancel }
  return token
}

// Two reads started one after the other come back in whatever order the network decides, and the
// slower one is the older one often enough to matter: it overwrites the screen with the answer to
// a question nobody is asking any more. Each claim takes a turn; only the claim nobody replaced
// may write. Cancelling takes a turn without handing it out, which is how a component that
// unmounts — or a view that changed — makes every answer still in flight arrive too late.
