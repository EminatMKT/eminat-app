import { LoadingScreen } from '@/shared/components/shell'

// El boundary de Suspense de TODA la app: lo que se ve mientras el router baja y evalúa el
// chunk de una ruta. Sin este archivo el App Router no tiene qué renderizar y deja pintada la
// pantalla ANTERIOR — no aparece un spinner, aparece la página vieja, quieta. Eso no se lee
// como «cargando», se lee como «se colgó», y se depura como un cuelgue: medido el 03/09/2026,
// se buscó del lado de las consultas y del hilo principal durante días.
//
// `LoadingScreen` y no algo del tamaño del contenido: acá todavía no hay shell —`/login` y
// `/reset-password` son pantallas sueltas y oscuras—, así que ocupa el viewport entero.
export default function Loading() {
  return <LoadingScreen />
}
