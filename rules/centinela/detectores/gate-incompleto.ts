import { lista, type Detector } from "./tipos.ts"

// Un verificador que no corre en el gate es un verificador apagado. La lista de cuáles tienen
// que estar la declara la regla en `verificadores:`, no este archivo: el motor no contiene
// reglas, las lee.
// Se busca la INVOCACIÓN (`pnpm <script>`), no el nombre suelto: `pre-push` menciona "tests" en
// su propio echo, y eso alcanzaba para dar por presente un comando que no estaba.
export const gateIncompleto: Detector = (texto, path, params) => {
  if (!/ci\.ya?ml$|pre-push$/.test(path)) return false
  return lista(params, "verificadores", []).some(
    (cmd) => !new RegExp(`(pnpm|npm run|yarn)\\s+${cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(texto),
  )
}
