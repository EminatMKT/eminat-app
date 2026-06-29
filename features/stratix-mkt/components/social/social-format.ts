import type { CSSProperties } from 'react'

// Formato corto de números (12.8K / 1.2M). Compartido por Social y Competencia.
export const fNum = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)

export const cardStyle = (s1: string, border: string): CSSProperties => ({ background: s1, border: `1px solid ${border}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' })

export const badgeStyle = (color: string): CSSProperties => ({ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600, whiteSpace: 'nowrap' })
