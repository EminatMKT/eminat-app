'use client'
import { TRIMESTRES } from '@/shared/context/AppContext'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import s from './index.module.css'

// El filtro del tablero: General y los cuatro trimestres.
export default function TrimestreSelector() {
  const { trimestre, setTrimestre } = useStratix()
  return (
    <div className={s.bar}>
      {TRIMESTRES.map(q => (
        <button key={q} type="button" onClick={() => setTrimestre(q)}
          aria-pressed={trimestre === q}
          className={`${s.chip} ${trimestre === q ? s.on : ''}`}>{q}</button>
      ))}
    </div>
  )
}
