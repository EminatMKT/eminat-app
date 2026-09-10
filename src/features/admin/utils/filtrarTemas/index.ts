import type { Tema } from '@/features/reuniones/types'

/** El buscador del catálogo. Mira el título y el código de la empresa: el UNIQUE de `temas` es
 *  (empresa, título), así que dos empresas pueden tener el mismo título a propósito y sin la
 *  empresa la lista no los distingue. */
export default function filtrarTemas(temas: Tema[], q: string): Tema[] {
  const busca = q.trim().toLowerCase()
  if (!busca) return temas
  return temas.filter(t =>
    t.titulo.toLowerCase().includes(busca) || t.empresa.toLowerCase().includes(busca))
}

// El filtro puro del catálogo de asuntos (`Tema`): lo consume el buscador de `TemasManager` en
// /admin (Tarea 6), y vive fuera del componente para poder probarse sin montar nada.
