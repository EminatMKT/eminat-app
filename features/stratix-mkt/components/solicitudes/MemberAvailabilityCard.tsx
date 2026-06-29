'use client'
import { useApp, getColorMarca } from '@/shared/context/AppContext'

const SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17]

export default function MemberAvailabilityCard({ refKey, nombre }: { refKey: string; nombre: string }) {
  const { s1, border, accent, t1, t2, t3, usuarios, actividades } = useApp()
  const tareasActivas = actividades.filter(a => a.responsable_ref === refKey && (a.estado === 'En proceso' || a.estado === 'Pendiente'))
  const horasOcupadas = Math.round(tareasActivas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0) * 10) / 10
  const horasSemanales = 40
  const horasLibres = Math.max(horasSemanales - horasOcupadas, 0)
  const pctOcupado = Math.min((horasOcupadas / horasSemanales) * 100, 100)
  const disponible = pctOcupado < 75
  const userInfo = usuarios.find((u: any) => u.responsable_ref === refKey)
  const isOnline = userInfo?.online_at ? new Date(userInfo.online_at) > new Date(Date.now() - 5 * 60 * 1000) : false
  return (
    <div style={{ background: s1, border: `2px solid ${disponible ? '#34D39930' : '#F8717130'}`, borderRadius: 16, padding: 18, transition: 'all .2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: userInfo?.color || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
              {nombre[0]}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: isOnline ? '#34D399' : '#555', border: `2px solid ${s1}` }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{nombre}</div>
            <div style={{ fontSize: 10, color: t3 }}>{tareasActivas.length} active tasks · {horasOcupadas}h occupied</div>
          </div>
        </div>
        <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: disponible ? '#34D39920' : '#F8717120', color: disponible ? '#34D399' : '#F87171', fontWeight: 700 }}>
          {disponible ? '✓ Available' : '✕ Busy'}
        </span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t3, marginBottom: 5 }}>
          <span>Weekly capacity (40h)</span>
          <span style={{ color: disponible ? '#34D399' : '#F87171', fontWeight: 600 }}>{horasLibres}h available</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: border, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: disponible ? '#34D399' : '#F87171', width: `${pctOcupado}%`, transition: 'width .5s' }} />
        </div>
        <div style={{ fontSize: 9, color: t3, marginTop: 4, textAlign: 'right' }}>{Math.round(pctOcupado)}% capacity used</div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: t3, marginBottom: 6, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Today's schedule (9am-6pm)</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SLOTS.map(hora => {
            const slotOcupado = pctOcupado > 85 || (pctOcupado > 60 && (hora >= 10 && hora <= 14))
            return (
              <div key={hora} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: slotOcupado ? '#F8717115' : '#34D39915', color: slotOcupado ? '#F87171' : '#34D399', fontFamily: 'DM Mono', border: `1px solid ${slotOcupado ? '#F8717130' : '#34D39930'}` }}>
                {hora}:00
              </div>
            )
          })}
        </div>
      </div>
      {tareasActivas.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}` }}>
          <div style={{ fontSize: 10, color: t3, marginBottom: 6 }}>Tasks in progress:</div>
          {tareasActivas.slice(0, 2).map(a => (
            <div key={a.id} style={{ fontSize: 11, color: t2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: getColorMarca(a.area_ref), marginRight: 5 }}>●</span>{a.titulo}
            </div>
          ))}
          {tareasActivas.length > 2 && <div style={{ fontSize: 10, color: t3 }}>+{tareasActivas.length - 2} more</div>}
        </div>
      )}
    </div>
  )
}
