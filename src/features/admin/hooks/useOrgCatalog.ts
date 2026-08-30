'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { OrgRow } from '@/shared/context/loadAppData'
import type { OrgCat } from '../org-catalogs'

// Deriva del contexto lo que la UI de un catálogo necesita: sus filas, cuántos
// dependientes tiene cada una (mismo criterio que bloquea el borrado en la API)
// y la línea de detalle a mostrar. Así OrgManager no sabe de reglas por catálogo.
//
// Los tres mapas son `Record<OrgCat, …>`: agregar un catálogo a ORG_CATALOGS sin
// darle filas/regla acá no compila (antes se coló `empresas` sin filas y reventó
// en runtime con `rows.length` sobre undefined).
export function useOrgCatalog(cat: OrgCat) {
  const { empresas, departamentos, equipos, cargos, jornadas, vinculaciones, adminUsuarios, actividades } = useApp()
  const { t } = useT()

  const filas: Record<OrgCat, OrgRow[]> = { empresas, departamentos, equipos, cargos, jornadas, vinculaciones }

  const reglas: Record<OrgCat, (row: OrgRow) => number> = {
    // Una empresa la usan dos relaciones distintas: pertenencia (personas) y
    // atribución (actividades, por `codigo`). Contar solo las personas mostraba
    // "0 en uso" con el botón de borrar habilitado en una empresa con
    // actividades, y el rechazo recién aparecía al clickear.
    //
    // La API suma tres tablas más —`solicitudes`, `slots_calendario` y
    // `reuniones`— que acá no se cuentan. Las dos primeras porque están vacías y
    // su migración quedó fuera de scope; `reuniones` porque NO vive en el
    // contexto y no puede vivir: su RLS filtra por usuario, así que un conteo
    // hecho desde el cliente saldría bajo y mentiría en el sentido peligroso
    // (diría "0 en uso" sobre una empresa que sí lo está).
    //
    // Consecuencia, y está anotada en .todo: una empresa con reuniones y sin
    // personas ni actividades muestra "0 en uso" con el botón habilitado, y el
    // rechazo aparece recién al clickear —con su mensaje traducido, no con el
    // error crudo de Postgres, porque la API sí la cuenta—. El arreglo de fondo
    // no es sumar una tabla más acá: es que este conteo y el `blockedBy` de la
    // API dejen de ser dos implementaciones de la misma regla.
    empresas: row =>
      adminUsuarios.filter(u => u.empresa_id === row.id).length +
      actividades.filter(a => a.empresa === row.codigo).length,
    departamentos: row => equipos.filter(e => e.departamento_id === row.id).length,
    equipos: row => adminUsuarios.filter(u => u.equipo_id === row.id).length,
    cargos: row => adminUsuarios.filter(u => (u.usuario_cargos || []).some(uc => uc.cargo_id === row.id)).length,
    jornadas: row => adminUsuarios.filter(u => u.jornada_id === row.id).length,
    vinculaciones: row => adminUsuarios.filter(u => u.vinculacion_id === row.id).length,
  }

  const detalles: Record<OrgCat, (row: OrgRow) => string> = {
    empresas: () => '',
    departamentos: () => '',
    cargos: () => '',
    vinculaciones: () => '',
    jornadas: row => t('admin.org.horasResumen', { n: row.horas_dia ?? 0 }),
    equipos: row => {
      const dep = departamentos.find(d => d.id === row.departamento_id)?.nombre
      const lider = adminUsuarios.find(u => u.id === row.lider_id)
      const liderName = lider ? `${lider.nombre || ''} ${lider.apellido || ''}`.trim() : t('admin.org.noLeader')
      return `${dep || '—'} · ${t('admin.org.lider')}: ${liderName}`
    },
  }

  return { rows: filas[cat], dependents: reglas[cat], describe: detalles[cat] }
}
