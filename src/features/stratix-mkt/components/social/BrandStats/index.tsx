'use client'
import type { CSSProperties } from 'react'
import { useT } from '@/shared/i18n'
import { fNum } from '@/features/stratix-mkt/utils/social-format'
import s from './index.module.css'

type BrandTotal = { codigo: string; color: string; followers: number; growth: number; reach: number; engagement: number; posts: number }

type Props = {
  b: BrandTotal
}

export default function BrandStats({ b }: Props) {
  const { t } = useT()
  return (
    <div className={s.card} style={{ '--marca': b.color } as CSSProperties}>
      <div className={s.head}>
        <span className={s.punto} />
        <span className={s.codigo}>{b.codigo}</span>
      </div>
      <div className={s.seguidores}>{fNum(b.followers)}</div>
      <div className={s.crecimiento}>+{fNum(b.growth)} · {t('stratix.social.eng', { n: b.engagement })}</div>
      <div className={s.pie}>
        <div className={s.dato}><span className={s.cifra}>{fNum(b.reach)}</span> {t('stratix.social.reach')}</div>
        <div className={s.dato}><span className={s.cifra}>{b.posts}</span> {t('stratix.social.posts')}</div>
      </div>
    </div>
  )
}
