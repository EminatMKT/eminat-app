import { ventas, porCobrar, depositos } from './data'

// Los datos son estáticos, así que los agregados se computan una sola vez al importar.
export const totals = (() => {
  const totalVentas = ventas.reduce((a, b) => a + b.monto, 0)
  const totalVencido = porCobrar.reduce((a, b) => a + b.vencido, 0)
  const totalPorVencer = porCobrar.reduce((a, b) => a + b.porVencer, 0)
  const totalDepositos = depositos.reduce((a, b) => a + b.monto, 0)
  return { totalVentas, totalVencido, totalPorVencer, totalCobrar: totalVencido + totalPorVencer, totalDepositos }
})()

export const ventasPorLab = (() => {
  const m: Record<string, number> = {}
  ventas.forEach(v => { m[v.lab] = (m[v.lab] || 0) + v.monto })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
})()

export const depositosPorBanco = (() => {
  const m: Record<string, number> = {}
  depositos.forEach(d => { m[d.banco] = (m[d.banco] || 0) + d.monto })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
})()

export const labStats = (() => {
  const m: Record<string, { ventas: number; cobrar: number; depositado: number }> = {}
  ventas.forEach(v => { if (!m[v.lab]) m[v.lab] = { ventas: 0, cobrar: 0, depositado: 0 }; m[v.lab].ventas += v.monto })
  porCobrar.forEach(p => { if (!m[p.lab]) m[p.lab] = { ventas: 0, cobrar: 0, depositado: 0 }; m[p.lab].cobrar += p.total })
  depositos.forEach(d => { if (!m[d.lab]) m[d.lab] = { ventas: 0, cobrar: 0, depositado: 0 }; m[d.lab].depositado += d.monto })
  return Object.entries(m).sort((a, b) => b[1].ventas - a[1].ventas)
})()
