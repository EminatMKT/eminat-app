import type { I18nKey } from '@/shared/i18n'

/** Lo que los grupos de filtros necesitan de afuera. Entra por parámetro y no por contexto para
 *  que los defs sigan siendo puros y testeables sin montar nada. */
export type Deps = {
  t: (k: I18nKey) => string
  nombrePorId: Record<string, string> // uuid de persona → nombre a mostrar
  departamentoPorResponsable: Record<string, string> // uuid de usuario → uuid de departamento
  nombreDepartamento: Record<string, string> // uuid de departamento → nombre a mostrar
  departamentoPropio?: string // el de quien mira: con eso arranca el filtro
}
