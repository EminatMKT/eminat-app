import { renderToStaticMarkup } from 'react-dom/server'

const SONDA_SIN_RENDER = 'capturarHook: the probe component did not render'

/** Runs a hook through one SSR render pass and returns what it produced — the shared test probe
 *  for every hook in this module, since none of them run their effects under `renderToStaticMarkup`. */
export default function capturarHook<T>(usar: () => T): T {
  let capturado: T | null = null
  function Sonda() {
    capturado = usar()
    return null
  }
  renderToStaticMarkup(<Sonda />)
  if (capturado === null) throw new Error(SONDA_SIN_RENDER)
  return capturado
}

// A single helper instead of each hook test file writing its own probe component — the near
//-identical shape across three test files is what this extraction exists to remove.
