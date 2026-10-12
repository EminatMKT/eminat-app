'use client'

import { useState, type ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { LoadingScreen, Sidebar, Topbar } from '@/shared/components/shell'
import ShellLayout from '@/shared/components/shell/ShellLayout'
import ShellDrawer from '@/shared/components/shell/ShellDrawer'

/** Only the three Meetings overview routes use this shell. The global onboarding
 * spotlight targets other modules and blocks these read-only screens. Reuse the
 * existing layout/drawer/navigation without mounting that tour or persisting its state. */
export default function MeetingsOverviewShell({ children, title }: { children: ReactNode; title?: string }) {
  const { loading } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  if (loading) return <LoadingScreen />
  return <ShellLayout part="root">
    <ShellDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
    </ShellDrawer>
    <ShellLayout part="column">
      <Topbar title={title} onHamburger={() => setMobileOpen(!mobileOpen)} />
      <ShellLayout part="content">{children}</ShellLayout>
    </ShellLayout>
  </ShellLayout>
}
