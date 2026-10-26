'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LayoutDashboard, Users, Globe2, ContactRound, Building2, Target, Columns3,
  CalendarCheck, BadgeCheck, BarChart3, CreditCard, MessagesSquare, Settings2 } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { salesSection, salesSectionHref, salesSections } from './navigation'
import s from './NativeSalesNavigation.module.css'

const icons = [LayoutDashboard, Users, Globe2, ContactRound, Building2, Target, Columns3,
  CalendarCheck, BadgeCheck, BarChart3, CreditCard, MessagesSquare, Settings2]

export default function NativeSalesNavigation({ onSelect }: { onSelect: (section: string) => void }) {
  const search = useSearchParams()
  const selected = salesSection(search)
  const { t } = useT()
  return <nav className={s.navigation} aria-label={t('salesNative.salesSections')}>
    {salesSections.map((item, index) => {
      const Icon = icons[index]
      return <Link key={item.key} href={salesSectionHref(search.toString(), item.key)}
        prefetch={false} aria-current={selected === item.key ? 'page' : undefined}
        className={s.item} onClick={event => {
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onSelect(item.key)
        }}><Icon size={15} aria-hidden="true" /><span>{t(item.labelKey)}</span></Link>
    })}
  </nav>
}
