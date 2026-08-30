import type { Reunion } from '@/features/reuniones/types'

// Se busca por título Y por código: son las dos formas en que alguien nombra una reunión — "la
// de presupuesto" o "MTG-EMC-20260829-001". Vive afuera del componente para poder probarse sin
// montar nada (hoy vitest corre sin DOM) y porque decide QUÉ se muestra, que es lógica.
//
// `codigo` es nullable: lo pone un trigger, así que entre el insert y el refresco puede llegar
// una fila sin él. Buscar sobre `undefined` daría "undefined" y una reunión sin código
// aparecería al teclear "undef" — de ahí el `?? ''`.
export function filtrarReuniones(reuniones: Reunion[], busqueda: string): Reunion[] {
  const q = busqueda.trim().toLowerCase()
  if (!q) return reuniones
  return reuniones.filter(r => `${r.titulo} ${r.codigo ?? ''}`.toLowerCase().includes(q))
}
