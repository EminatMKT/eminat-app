'use client'
import { ReactNode } from 'react'
import { Button } from '@/shared/components/ui'
import NotificationsBell from '@/shared/components/shell/NotificationsBell'
import DevBadge from '@/shared/components/shell/DevBadge'
import TopbarLayout from '@/shared/components/shell/TopbarLayout'
import TopbarHeading from '@/shared/components/shell/TopbarHeading'
import TopbarPresence from '@/shared/components/shell/TopbarPresence'
import ThemeToggle from '@/shared/components/shell/ThemeToggle'
import TopbarMessage from '@/shared/components/shell/TopbarMessage'

type Props = {
  title?: string
  actions?: ReactNode
  /** Opens the navigation, which folds into a drawer on a phone. */
  onHamburger: () => void
}

export default function Topbar({ title, actions, onHamburger }: Props) {
  return (
    <TopbarLayout part="bar">
      <TopbarLayout part="lead">
        <TopbarLayout part="menu">
          <Button kind="menu" iconOnly onClick={onHamburger} />
        </TopbarLayout>
        <DevBadge />
        <TopbarHeading title={title} />
      </TopbarLayout>
      <TopbarLayout part="actions">
        <TopbarLayout part="flash"><TopbarMessage /></TopbarLayout>
        <NotificationsBell />
        <TopbarPresence />
        <ThemeToggle />
        {actions}
      </TopbarLayout>
    </TopbarLayout>
  )
}

// The shell's topbar, shared by every module: the page's banner landmark. It only composes pieces;
// their layout, and what changes on a phone, lives in TopbarLayout's stylesheet.
