import { LoadingScreen } from '@/shared/components/shell'

// El boundary de las 12 rutas protegidas. Cubre lo caro: cambiar de módulo baja el chunk del
// feature entero —medido el 03/09/2026, entre ~1 kB (Directorio) y ~145 kB (Research)— y sin
// este archivo todo ese rato se ve el módulo anterior sin una sola señal.
//
// Ocupa el viewport entero, igual que el de la raíz, y eso NO es un descuido: `AppShell` lo
// monta cada página —no este layout, que sólo pone AppProvider y ModuleGate—, así que durante
// el fallback el sidebar y el topbar no están. Un spinner del tamaño del área de contenido
// quedaría flotando en una página vacía y se leería como una pantalla rota; el de viewport
// completo se lee como lo que es, y además es el MISMO que ya muestra AppProvider mientras
// resuelve el perfil, así que entrar y navegar se ven igual.
//
// Para que el shell sobreviva al fallback —y el spinner sea sólo el área de contenido—, AppShell
// tendría que subir a este layout. Es un trabajo aparte y está anotado en el .todo, junto con
// las subrutas por sub-vista: son la misma idea.
export default function AppLoading() {
  return <LoadingScreen />
}
