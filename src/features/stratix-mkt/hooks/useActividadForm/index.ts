import { useState } from 'react'
import { useApp, MESES, mesATrimestre } from '@/shared/context/AppContext'
import { ESTADO } from '@/shared/constants/domain'
import { actividadesRepo, notificacionesRepo } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { actividadAForm } from '@/features/stratix-mkt/utils/act-form'
import type { Actividad, NuevaActForm, FormActividad } from '@/features/stratix-mkt/types'

const emptyNuevaAct = (solicitanteId = ''): NuevaActForm => ({
  titulo: '', descripcion: '', empresa: '', responsable_id: '',
  mes: MESES[new Date().getMonth()], horas: '', dias_produccion: '',
  estado: ESTADO.PENDIENTE, fecha_entrega: '', solicitante_id: solicitanteId, drive_url: '',
})

const formVacio = (solicitanteId: string): FormActividad => ({
  abierto: false, guardando: false, editando: null, valores: emptyNuevaAct(solicitanteId),
})

// centinela-exime: archivo-extenso@1 — alta, edición y borrado comparten el MISMO payload y
// el mismo estado de formulario; separarlas duplicaría la construcción del payload, que es
// justo lo que hace que crear y editar no se desincronicen.
// El alta, la edición y el borrado de una tarea, más la ficha que los dispara. El formulario es
// UN estado y no cuatro: abrirlo, cerrarlo y resetearlo son una asignación cada uno, así que no
// hay forma de dejar `editando` puesto mientras el modal ya se cerró — que era el peor bug
// posible acá (la próxima "Nueva tarea" habría hecho UPDATE sobre la tarea vieja).
export function useActividadForm() {
  const { usuario, usuarios, mostrarMensaje, setActividades, miembrosAsignables } = useApp()
  const { t } = useT()

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
    // Mismo hueco que el efecto de empresa del modal, acá para el responsable: si la persona
    // salió del equipo (o está excluida), el <select> se vería vacío mientras el estado conserva
    // el id viejo — lo que se ve ≠ lo que se guarda. Se resetea.
    if (!miembrosAsignables.some(m => m.id === f.responsable_id)) f.responsable_id = ''
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

  async function crearActividad() {
    // Los tres son NOT NULL en la DB (`responsable_id` y `empresa` además son FK). Sin este
    // chequeo, un usuario de Stratix fuera de MKT —cuyo select de responsable renderiza vacío
    // porque `miembrosAsignables` lo está— manda `responsable_id: ''` y recibe un
    // `invalid input syntax for type uuid` crudo de Postgres.
    if (!valores.titulo.trim()) { mostrarMensaje('error', t('stratix.new.titleRequired')); return }
    if (!valores.responsable_id) { mostrarMensaje('error', t('stratix.new.assigneeRequired')); return }
    if (!valores.empresa) { mostrarMensaje('error', t('stratix.new.brandRequired')); return }

    setForm(p => ({ ...p, guardando: true }))
    try {
      // Payload completo con nulls (no campos omitidos): así el mismo objeto sirve para crear y
      // para editar, y editar puede LIMPIAR un campo, no solo cambiarlo.
      const payload: Record<string, unknown> = {
        titulo: valores.titulo.trim(),
        empresa: valores.empresa,
        responsable_id: valores.responsable_id,
        mes: valores.mes,
        trimestre: mesATrimestre[valores.mes] || 'Q1',
        estado: valores.estado,
        descripcion: valores.descripcion || null,
        horas: valores.horas ? Number(valores.horas) : null,
        dias_produccion: valores.dias_produccion ? Number(valores.dias_produccion) : null,
        fecha_entrega: valores.fecha_entrega || null,
        solicitante_id: valores.solicitante_id || null,
        drive_url: valores.drive_url || null,
      }

      if (editando?.id) {
        const { error } = await actividadesRepo.update(editando.id, payload)
        if (error) { mostrarMensaje('error', t('common.errorWithDetail', { detail: error.message })); setForm(p => ({ ...p, guardando: false })); return }
        setActividades(prev => prev.map(x => (x.id === editando.id ? { ...x, ...payload } as Actividad : x)))
        resetFormAct()
        mostrarMensaje('ok', t('stratix.edit.saved'))
      } else {
        const { data, error } = await actividadesRepo.create(payload)
        if (error) { mostrarMensaje('error', t('common.errorWithDetail', { detail: error.message })); setForm(p => ({ ...p, guardando: false })); return }
        setActividades(prev => [data as Actividad, ...prev])
        if (data && valores.responsable_id && valores.responsable_id !== usuario?.id) {
          await notificacionesRepo.insert({ usuario_id: valores.responsable_id, tipo: 'tarea_asignada', titulo: t('stratix.notif.assignedTitle'), mensaje: `"${valores.titulo}" — ${valores.empresa} · ${valores.mes}`, actividad_id: (data as Actividad).id, leida: false })
        }
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
