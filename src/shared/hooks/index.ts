// Barrel de los hooks transversales (ver rules/codigo.md · "un directorio de src/shared/ se
// importa por su barrel"). Re-exportación NOMBRADA, no `export *`: es la forma que Next 14
// resuelve sin arrastrar los vecinos al grafo de módulos.
// Los nombres ya son únicos y se explican solos, así que no hace falta namespace.
export { useClock } from './useClock'
export { usePersistedState, readPref, writePref, oneOf } from './usePersistedState'
export { useUserPreference, writeUserPreference, userPrefKey, LAST_MODULE_KEY } from './useUserPreference'
