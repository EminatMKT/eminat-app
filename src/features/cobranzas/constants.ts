import type { CobTab } from './types'
import { TABLES, type TableName } from '@/shared/data/tables'

export const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C']

export const TABS: { key: CobTab; label: string; soon?: boolean }[] = [
  { key: 'ventas', label: '💰 Monthly Sales' },
  { key: 'cuentas', label: '📋 Accounts Receivable' },
  { key: 'depositos', label: '🏦 Bank Deposits', soon: true },
]

// Tabla de Supabase por tab (nombres desde la única fuente shared/data/tables)
export const TABLE: Record<CobTab, TableName> = {
  ventas: TABLES.cobranzasVentas,
  cuentas: TABLES.cobranzasCuentas,
  depositos: TABLES.cobranzasDepositos,
}

// Campos del modal "Add record" por tab
export const ADD_FIELDS: Record<CobTab, string[]> = {
  ventas: ['mes', 'periodo', 'laboratorio', 'estudio', 'monto'],
  cuentas: ['laboratorio', 'estudio', 'tipo', 'vencido', 'por_vencer'],
  depositos: ['periodo', 'contratante', 'banco', 'identificacion', 'estudio', 'depositado'],
}

// Campos numéricos (input type=number en el form, parseo en cálculos)
export const NUMERIC_FIELDS = ['monto', 'vencido', 'por_vencer', 'depositado']

// Cabeceras de export/print CSV por tab
export const EXPORT_HEADERS: Record<CobTab, string[]> = {
  ventas: ['Month', 'Period', 'Lab', 'Study', 'Amount'],
  cuentas: ['Lab', 'Study', 'Type', 'Past Due', 'Upcoming', 'Total'],
  depositos: ['Period', 'Contractor', 'Bank', 'ID', 'Study', 'Deposited'],
}

// Cabeceras de la tabla en pantalla por tab (cuentas muestra "Total Owed", no "Total")
export const TABLE_HEADERS: Record<CobTab, string[]> = {
  ventas: ['Month', 'Period', 'Lab', 'Study', 'Amount'],
  cuentas: ['Lab', 'Study', 'Type', 'Past Due', 'Upcoming', 'Total Owed'],
  depositos: ['Period', 'Contractor', 'Bank', 'ID', 'Study', 'Deposited'],
}

export const TAB_TITLE: Record<CobTab, string> = {
  ventas: 'Monthly Sales',
  cuentas: 'Accounts Receivable',
  depositos: 'Bank Deposits',
}
