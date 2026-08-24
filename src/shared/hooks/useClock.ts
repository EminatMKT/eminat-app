'use client'
import { useEffect, useState } from 'react'

// Reloj de pared (hh:mm:ss, es-EC) que ticka cada segundo.
export function useClock(): string {
  const [horaActual, setHoraActual] = useState('')
  useEffect(() => {
    const update = () => setHoraActual(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return horaActual
}
