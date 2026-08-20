'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import ColorBadge from '@/shared/components/ui/ColorBadge'
import { fNum } from '@/features/stratix-mkt/utils/social-format'
import type { SocialAccount } from '@/features/stratix-mkt/data'
import s from './index.module.css'

// Umbrales de interacción: verde bueno, ámbar aceptable, rojo flojo.
const engColor = (e: number) => (e >= 5 ? '#34D399' : e >= 3 ? '#FBB040' : '#F87171')

type Props = {
  acc: SocialAccount
}

export default function AccountRow({ acc }: Props) {
  const { colorMarca } = useApp()
  const { t } = useT()
  return (
    <tr className={s.row}>
      <td className={s.handle}>{acc.handle}</td>
      {/* `acc.brand` sale de social_accounts, texto libre sin FK: si no matchea ningún código
          del catálogo cae al fallback, igual que antes. */}
      <td className={s.plano}><ColorBadge color={colorMarca[acc.brand] ?? COLOR_MARCA_FALLBACK}>{acc.brand}</ColorBadge></td>
      <td className={s.destacado}>{fNum(acc.followers)}</td>
      <td className={s.crece}>+{fNum(acc.followersChange)}</td>
      <td className={s.td}>{acc.posts}</td>
      <td className={s.td}>{fNum(acc.reach)}</td>
      <td className={s.plano}><ColorBadge color={engColor(acc.engagement)}>{acc.engagement}%</ColorBadge></td>
      <td className={s.tenue}>{fNum(acc.impressions)}</td>
      <td className={s.plano}>
        <div className={s.mejor}>{acc.bestPost}</div>
        <div className={s.mejorAlcance}>{fNum(acc.bestReach)} {t('stratix.social.reach')}</div>
      </td>
    </tr>
  )
}
