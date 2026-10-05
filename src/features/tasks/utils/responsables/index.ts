import ordered from './ordered'
import responsablePrincipal from './responsable-principal'

export { default as responsablesOrdenados } from './ordered'
export { default as responsablePrincipal } from './responsable-principal'
export { default as esResponsable } from './es-responsable'
export { default as etiquetaResponsablesCompacta } from './compact-label'
export { default as usersFromNames } from './names'

const meetHelpers = {
  responsablesOrdenados: ordered,
  responsablePrincipal,
}
export default meetHelpers

// Activity-responsible helpers keep membership, principal selection, and compact labels consistent:
// they all read the same order (`ordered`: leader first, then by display name), so the name the
// card shows is the first one the detail and the pay sheet list. The app imports them by name.
//
// The default object exists only for the Meet integration (`integrations/meet/_shared/responsibles`),
// which still calls `responsables.responsablePrincipal` and `responsables.responsablesOrdenados` and
// is frozen. It goes away the day Meet imports the two functions by name.
