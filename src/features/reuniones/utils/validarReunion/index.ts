import type { I18nKey } from '@/shared/i18n'
import type { ReunionForm } from '@/features/reuniones/types'

// Devuelve CLAVES de i18n TIPADAS (`I18nKey`), no `string[]`: quien la llama traduce.
// El tipo importa — `I18nKey` es la unión de las claves reales de es.json, así que una clave
// mal escrita acá no compila, en vez de llegar al usuario como texto crudo. Y evita que quien
// la consume tenga que castear la clave al usarla, que sería un `as` puesto sólo para callar
// al compilador (rules/codigo.md).
// Quien la llama traduce. Así la función es pura —se prueba
// sin montar nada, que importa porque vitest corre sin DOM— y el mensaje que ve el usuario sigue
// saliendo de es.json / en.json en vez de quedar hardcodeado acá.
//
// Devuelve TODOS los errores, no el primero: un formulario que se arregla de a un error por
// intento es el que hace abandonar a la mitad.
//
// Las tres primeras son las obligatorias. `hora_fin >= hora_inicio` es la misma regla que el
// CHECK `horas_coherentes` de la tabla, y está en los dos lados a propósito: la base es la que
// garantiza, y ésta es la que hace que el usuario vea un mensaje traducido en vez del error
// crudo de Postgres. Si una cambia, la otra también — usan `>=` las dos.
export function validarReunion(form: ReunionForm): I18nKey[] {
  // Seis campos no entran en la firma sin volverla un párrafo (rules/codigo.md).
  const { empresa, titulo, fecha, modalidad, hora_inicio, hora_fin } = form
  const errores: I18nKey[] = []
  if (!empresa) errores.push('reuniones.error.empresa')
  if (!titulo.trim()) errores.push('reuniones.error.titulo')
  if (!fecha) errores.push('reuniones.error.fecha')
  // `modalidad` tiene DEFAULT en la base, así que la columna nunca queda vacía — y por eso
  // mismo hay que exigirla acá: sin este chequeo el formulario guardaría 'presencial' sin que
  // nadie lo eligiera, que es el bug de "New task" del 12/08 (rules/ui.md).
  if (!modalidad) errores.push('reuniones.error.modalidad')
  // Las horas son opcionales: sin las dos no hay nada que comparar. Como son 'HH:MM' de ancho
  // fijo, comparar los strings equivale a comparar las horas.
  if (hora_inicio && hora_fin && hora_fin < hora_inicio) {
    errores.push('reuniones.error.horas')
  }
  return errores
}
