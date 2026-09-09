import type { ButtonKind, ButtonMeta } from './types'

// Qué distingue a cada botón: su ícono, su rótulo por defecto y su tono. Es un objeto META, el
// mismo patrón con el que este repo enumera todo lo demás (ESTADO, MODALIDAD, ROL_EN_REUNION):
// agregar una clase de botón es agregar UNA fila, y el compilador reclama lo que falte.
//
// El ícono lo pone el componente y no cada pantalla: vivía escrito dentro de las claves i18n
// ("+ Nuevo usuario") y faltaba en otras, así que el símbolo se desincronizaba entre vistas.
export const BUTTON_META = {
  new:     { icono: '+',  labelKey: 'common.new',         tono: 'primario' },
  edit:    { icono: '✏️', labelKey: 'common.edit',         tono: 'primario' },
  // El rojo NO es decorativo: es la única señal previa de que la acción es destructiva. La
  // confirmación la pone quien lo usa, con ConfirmModal — este botón no la trae.
  delete:  { icono: '🗑', labelKey: 'common.delete',       tono: 'peligro' },
  cancel:  { icono: '',   labelKey: 'common.cancel',       tono: 'secundario' },
  confirm: { icono: '',   labelKey: 'common.saveChanges',  tono: 'primario' },
  // Imprimir no es confirmar. Entró como fila el 31/08/2026 porque el botón del reporte de pago
  // se había puesto `kind="confirm"` con un `label` que tapaba el rótulo de "Guardar cambios":
  // funcionaba, y decía una mentira sobre lo que hace — que es justo lo que el tono derivado
  // del `kind` existe para impedir.
  print:   { icono: '🖨', labelKey: 'common.print',        tono: 'primario' },
  // Limpiar filtros. Entró como fila el 04/09/2026 cuando `FilterBar` dejó de dibujar su propio
  // `<button>`: era la misma acción con su propio padding, su propio radio y dos claves i18n
  // distintas —`stratix.filter.clear` y `research.filter.clear`— que decían "Limpiar" las dos.
  // Secundario porque no es la acción principal de la barra: la principal es filtrar.
  clear:   { icono: '✕',  labelKey: 'common.clear',        tono: 'secundario' },
  // Marcar algo como lo que abre por defecto. Entró el 04/09/2026 con las vistas de filtro. No es
  // `confirm` con otro rótulo: no guarda cambios, elige cuál de varias cosas es la de entrada — y
  // el tono derivado del `kind` existe justo para que un botón no mienta sobre lo que hace. El ★
  // es el mismo símbolo con el que la vista marcada aparece en su desplegable.
  star:    { icono: '★',  labelKey: 'common.setDefault',   tono: 'secundario' },
} satisfies Record<ButtonKind, ButtonMeta>
