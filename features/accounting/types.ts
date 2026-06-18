import { ventas, porCobrar, depositos } from './data'

// Tipos de fila derivados de los datos (evita declararlos a mano y desincronizarlos).
export type Venta = (typeof ventas)[number]
export type PorCobrar = (typeof porCobrar)[number]
export type Deposito = (typeof depositos)[number]
export type LabStat = { ventas: number; cobrar: number; depositado: number }
