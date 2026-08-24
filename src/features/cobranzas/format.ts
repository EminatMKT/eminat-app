// Formato de moneda USD usado en KPIs, tablas, charts y print.
export const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
