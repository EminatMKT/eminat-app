// Registros de cobranzas. Vienen de Supabase y del import CSV (claves arbitrarias),
// por eso el index signature además de los campos conocidos.
export type Venta = { id?: string; mes?: string; periodo?: string; laboratorio?: string; estudio?: string; monto?: number | string; [k: string]: unknown }
export type Cuenta = { id?: string; laboratorio?: string; estudio?: string; tipo?: string; vencido?: number | string; por_vencer?: number | string; [k: string]: unknown }
export type Deposito = { id?: string; periodo?: string; contratante?: string; banco?: string; identificacion?: string; estudio?: string; depositado?: number | string; [k: string]: unknown }

export type CobTab = 'ventas' | 'cuentas' | 'depositos'

export type Filtros = { periodo: string; laboratorio: string; estudio: string; banco: string; contratante: string; tipo: string }
