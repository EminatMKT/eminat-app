'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import ColorBadge from '@/shared/components/ui/ColorBadge'
import { fNum } from '@/features/stratix-mkt/utils/social-format'
import type { SocialPlatform } from '@/features/stratix-mkt/data'
import AccountRow from '../AccountRow'
import s from './index.module.css'

const COLS: I18nKey[] = ['stratix.social.col.account', 'stratix.social.col.brand', 'stratix.social.col.followers',
  'stratix.social.col.growth', 'stratix.social.col.posts', 'stratix.social.col.reach',
  'stratix.social.col.engagement', 'stratix.social.col.impressions', 'stratix.social.col.best']

type Props = {
  platform: SocialPlatform
}

export default function PlatformCard({ platform }: Props) {
  const { t } = useT()
  const seguidores = platform.accounts.reduce((acc, a) => acc + a.followers, 0)
  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.icono}>{platform.icon}</span>
        <span className={s.nombre}>{platform.name}</span>
        <ColorBadge color={platform.color}>{t('stratix.social.accounts', { n: platform.accounts.length })}</ColorBadge>
        <div className={s.espaciador} />
        <span className={s.total}>
          {t('stratix.social.totalLabel')} <span className={s.cifra}>{fNum(seguidores)}</span> {t('stratix.social.followers')}
        </span>
      </div>
      <table className={s.tabla}>
        <thead>
          <tr className={s.encabezado}>
            {COLS.map(c => <th key={c} className={s.th}>{t(c)}</th>)}
          </tr>
        </thead>
        <tbody>
          {platform.accounts.map(acc => <AccountRow key={acc.handle} acc={acc} />)}
        </tbody>
      </table>
    </div>
  )
}
