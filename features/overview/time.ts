// Hora local de una timezone; si la TZ no es válida, devuelve el fallback.
export function getLocalTime(tz: string, fallback: string): string {
  try {
    return new Date().toLocaleTimeString('es-EC', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch {
    return fallback
  }
}
