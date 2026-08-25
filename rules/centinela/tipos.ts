// El JSON que Claude Code manda por stdin al hook PreToolUse. Todo opcional: viene de afuera y
// no hay garantía de forma — tiparlo así obliga a preguntar antes de leer, que es justo lo que
// `any` dejaba saltear.
export type PayloadHook = {
  tool_name?: string
  tool_input?: {
    file_path?: string
    command?: string
    content?: string
    new_string?: string
    edits?: { new_string?: string }[]
  }
}

// Una regla que un archivo no pasa, tal como se le muestra a quien edita.
export type Falla = {
  regla: string
  motivo: string
}

// --- El parser de reglas: la forma de un check y la de sus tests declarados ---

export type TestDeRegla = {
  esperaFalla: boolean
  esNuevo: boolean
  path: string
  contenido: string
}

export type Check = {
  soloNuevos: boolean
  regla: string
  motivo: string
  pattern?: string
  detector?: string
  requires?: string
  absent?: string
  /** clave con la que un archivo puede eximirse de este check */
  exime?: string
  /** versión de la regla: una marca de exención más vieja que esto deja de valer */
  version?: number
  files: string[]
  except: string[]
  paths?: string[]
  /** Los números y listas que SON la regla (umbrales, catálogos), declarados en su bloque
   *  `check:` en vez de hardcodeados en el detector: el motor no contiene reglas, las lee. */
  params: Record<string, string>
  tests: TestDeRegla[]
}
