'use client'
import { useT } from '@/shared/i18n'
import ColorBadge from '@/shared/components/ui/ColorBadge'
import { fNum } from '@/features/stratix-mkt/utils/comp-format'
import { TENDENCIA_COLORS, TENDENCIA_ICONS } from '@/features/stratix-mkt/data'
import type { Competitor } from '@/features/stratix-mkt/data'
import RedSocialStat from '../RedSocialStat'
import PuntoLista from '../PuntoLista'
import s from './index.module.css'

// Umbrales de la nota de Google (sobre 5).
const notaClase = (n: number) => (n >= 4.5 ? 'buena' : n >= 4 ? 'aceptable' : '')

export default function CompetitorCard({ comp }: { comp: Competitor }) {
  const { t } = useT()
  return (
    <div className={s.card}>
      <div className={s.tendencia}>
        <ColorBadge color={TENDENCIA_COLORS[comp.tendencia]}>{TENDENCIA_ICONS[comp.tendencia]} {comp.tendencia}</ColorBadge>
      </div>
      <div className={s.head}>
        <div className={s.nombre}>{comp.name}</div>
        <div className={s.meta}>{comp.tipo} · {comp.ubicacion}</div>
        <div className={s.web}>{comp.website}</div>
      </div>

      <div className={s.redes}>
        <RedSocialStat red="📸 Instagram" valor={fNum(comp.igFollowers)} extra={`${comp.igEngagement}%`} />
        <RedSocialStat red="👤 Facebook" valor={fNum(comp.fbFollowers)} />
        <RedSocialStat red="🎵 TikTok" valor={comp.tkFollowers > 0 ? fNum(comp.tkFollowers) : '—'} />
      </div>

      <div className={s.rating}>
        <span>⭐</span>
        <span className={`${s.nota} ${s[notaClase(comp.googleRating)] ?? ''}`}>{comp.googleRating}</span>
        <span className={s.detalle}>{t('stratix.comp.reviews', { n: comp.googleReviews })}</span>
        <span className={s.detalle}>· {comp.precioRango}</span>
      </div>

      <div className={s.bloque}>
        <div className={s.rotulo}>{t('stratix.comp.services')}</div>
        <div className={s.servicios}>
          {comp.servicios.map(srv => <span key={srv} className={s.servicio}>{srv}</span>)}
        </div>
      </div>

      <div className={s.foda}>
        <div>
          <div className={s.rotuloPro}>{t('stratix.comp.strengths')}</div>
          {comp.fortalezas.map(f => <PuntoLista key={f} texto={f} />)}
        </div>
        <div>
          <div className={s.rotuloContra}>{t('stratix.comp.weaknesses')}</div>
          {comp.debilidades.map(d => <PuntoLista key={d} texto={d} contra />)}
        </div>
      </div>
    </div>
  )
}
