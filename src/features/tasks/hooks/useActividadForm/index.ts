import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { ESTADO } from '@/shared/constants/domain'
import { actividadesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { localDate } from '@/shared/utils/dates'
import { actividadAForm } from '@/features/tasks/utils/act-form'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import { payloadDeActividad, payloadDeAlta } from './payload'
import saveResponsables from './save-responsables'
import upsertActividad from './upsert-actividad'
import type { Actividad, ActividadResponsable, NuevaActForm, FormActividad } from '@/features/tasks/types'

const emptyNuevaAct = (solicitanteId = ''): NuevaActForm => ({
  titulo: '', descripcion: '', empresa: '', responsables: [],
  fecha_inicio: localDate(), horas: '', dias_produccion: '',
  estado: ESTADO.PENDIENTE, fecha_entrega: '', solicitante_id: solicitanteId, drive_url: '',
})

const formVacio = (solicitanteId: string): FormActividad => ({
  abierto: false, guardando: false, editando: null, valores: emptyNuevaAct(solicitanteId),
})

// centinela-exime: archivo-extenso@2 — alta, edición y borrado comparten el MISMO payload y
// el mismo estado de formulario; separarlas duplicaría la construcción del payload, que es
// justo lo que hace que crear y editar no se desincronicen.
// El alta, la edición y el borrado de una tarea, más la ficha que los dispara. El formulario es
// UN estado y no cuatro: abrirlo, cerrarlo y resetearlo son una asignación cada uno, así que no
// hay forma de dejar `editando` puesto mientras el modal ya se cerró — que era el peor bug
// posible acá (la próxima "Nueva tarea" habría hecho UPDATE sobre la tarea vieja).
export function useActividadForm() {
  const { usuario, usuarios, mostrarMensaje, setActividades, miembrosAsignables } = useApp()
  const { t, intlLocale } = useT()

  // centinela-exime: useState@1 — la ficha abierta y el formulario son dos cosas distintas: se
  // abren por caminos distintos (la ficha desde una tarjeta, el form desde "Nueva tarea" o
  // desde Editar) y ninguna operación escribe en las dos a la vez.
  const [form, setForm] = useState<FormActividad>(formVacio(usuario?.id || ''))
  const [modalVerAct, setModalVerAct] = useState<Actividad | null>(null)
  const { abierto, guardando, editando, valores } = form

  // Mantiene la firma que usa el modal (`setNuevaAct(p => ({ ...p, campo }))`) sin exponer la
  // forma interna del estado.
  const setNuevaAct = (upd: NuevaActForm | ((p: NuevaActForm) => NuevaActForm)) =>
    setForm(p => ({ ...p, valores: typeof upd === 'function' ? upd(p.valores) : upd }))

  const setModalNuevaAct = (v: boolean) => setForm(p => ({ ...p, abierto: v }))

  function abrirEdicion(a: Actividad) {
    const f = actividadAForm(a)
    // Someone who left the team has no row in the checklist: keeping them would save a person
    // the form does not show.
    f.responsables = f.responsables.filter(r => miembrosAsignables.some(m => m.id === r.usuario_id))
    // Ídem para el solicitante, PERO solo si el id está huérfano (el usuario ya no existe): un
    // inactivo EXISTE y el sistema lo sabe mostrar (miembrosPorId incluye inactivos a propósito;
    // borrarle la atribución perdería quién pidió la tarea).
    if (!usuarios.some(u => u.id === f.solicitante_id)) f.solicitante_id = ''
    setForm({ abierto: true, guardando: false, editando: a, valores: f })
    setModalVerAct(null)
  }

  // Apaga el formulario y lo deja limpio. Es lo que corre DESPUÉS de guardar: el cambio ya se ve
  // en el tablero y el aviso lo confirma, así que no hay a qué volver.
  const resetFormAct = () => setForm(formVacio(usuario?.id || ''))

  // El que usan la ✕ y Cancelar. Salir del editor es "no quiero editar", no "no quiero ver la
  // tarea": se vuelve a la ficha de donde se abrió, no al tablero.
  function cerrarFormAct() {
    const volverA = editando
    resetFormAct()
    if (volverA) setModalVerAct(volverA)
  }

  async function eliminarAct(a: Actividad) {
    if (!a.id) return
    const { error } = await actividadesRepo.remove(a.id)
    if (error) { mostrarMensaje('error', t('stratix.detail.deleteError')); return }
    setActividades(prev => prev.filter(x => x.id !== a.id))
    setModalVerAct(null)
    mostrarMensaje('ok', t('stratix.detail.deleted'))
  }

  // The task row is saved; this writes who is on it. On failure the form stays open editing the
  // saved row, so a retry updates it instead of creating a duplicate.
  async function persistResponsables(fila: Actividad, previos: ActividadResponsable[]) {
    const notice = {
      titulo: t('stratix.notif.assignedTitle'),
      mensaje: `"${valores.titulo}" — ${valores.empresa} · ${periodoLargo(valores.fecha_inicio, intlLocale)}`,
    }
    const pedido = {
      actividadId: fila.id,
      previous: previos,
      next: valores.responsables,
      actorId: usuario?.id,
      notice,
    }
    const fallo = await saveResponsables(pedido)
    const visible = fallo ? fila : { ...fila, responsables: valores.responsables }
    setActividades(prev => upsertActividad(prev, visible))
    if (!fallo) return true
    mostrarMensaje('error', t('common.errorWithDetail', { detail: fallo }))
    setForm(p => ({ ...p, guardando: false, editando: fila }))
    return false
  }

  async function crearActividad() {
    // Title and brand are required; responsibles are not — a task may stay unassigned.
    if (!valores.titulo.trim()) { mostrarMensaje('error', t('stratix.new.titleRequired')); return }
    if (!valores.empresa) { mostrarMensaje('error', t('stratix.new.brandRequired')); return }

    setForm(p => ({ ...p, guardando: true }))
    try {
      const payload = payloadDeActividad(valores)
      if (editando?.id) {
        const { data, error, conflict, current } = await actividadesRepo.update(editando.id, payload, editando.updated_at)
        if (conflict) {
          if (current) setActividades(prev => prev.map(x => (x.id === editando.id ? current as Actividad : x)))
          mostrarMensaje('error', t('stratix.edit.conflict'))
          setForm(p => ({ ...p, guardando: false }))
          return
        }
        if (error) { mostrarMensaje('error', t('common.errorWithDetail', { detail: error.message })); setForm(p => ({ ...p, guardando: false })); return }
        const guardados = await persistResponsables(data as Actividad, editando.responsables)
        if (!guardados) return
        resetFormAct()
        mostrarMensaje('ok', t('stratix.edit.saved'))
      } else {
        const { data, error } = await actividadesRepo.create(payloadDeAlta(valores, usuario?.id))
        if (error) { mostrarMensaje('error', t('common.errorWithDetail', { detail: error.message })); setForm(p => ({ ...p, guardando: false })); return }
        const sinResponsables: ActividadResponsable[] = []
        const guardados = await persistResponsables(data as Actividad, sinResponsables)
        if (!guardados) return
        resetFormAct()
        mostrarMensaje('ok', t('stratix.new.created'))
      }
    } catch {
      mostrarMensaje('error', t(editando ? 'stratix.edit.saveError' : 'stratix.new.createError'))
    }
    setForm(p => ({ ...p, guardando: false }))
  }

  const formulario = {
    modalNuevaAct: abierto,
    setModalNuevaAct,
    nuevaAct: valores,
    setNuevaAct,
    creandoAct: guardando,
    actEditando: editando,
    modalVerAct,
    setModalVerAct,
    abrirEdicion,
    cerrarFormAct,
    eliminarAct,
    crearActividad,
  }

  return formulario
}
