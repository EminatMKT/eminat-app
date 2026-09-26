'use client'
import { usePathname } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import { modulePath, ROUTES } from '@/shared/auth/permissions'
import TopbarBrands from '@/shared/components/shell/TopbarBrands'
import TopbarDate from '@/shared/components/shell/TopbarDate'
import TopbarLayout from '@/shared/components/shell/TopbarLayout'
import { NAV, AUTO_TITLE } from '@/shared/components/shell/appShellConfig'

type Props = {
  /** The page's own title. Without it, the one derived from the route. */
  title?: string
}

export default function TopbarHeading({ title }: Props) {
  const { usuario } = useApp()
  const pathname = usePathname()

  // The page's explicit title, or one derived from the route (AUTO_TITLE by slug).
  const activeNav = NAV.find(i => pathname.startsWith(modulePath(i.slug)))
  const autoTitle = pathname === ROUTES.home
    ? `Eminat Group — Welcome, ${usuario?.nombre}`
    : (activeNav && AUTO_TITLE[activeNav.slug]) || 'Stratix'

  return (
    <TopbarLayout part="heading">
      <TopbarLayout part="title">{title || autoTitle}</TopbarLayout>
      <TopbarLayout part="meta">
        <TopbarDate />
        <TopbarLayout part="rule" />
        <TopbarBrands />
      </TopbarLayout>
    </TopbarLayout>
  )
}

// The left side of the topbar: where the person is, today's date and the group's brands.
