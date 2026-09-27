'use client'
import { useState, ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import Onboarding from '@/shared/components/shell/Onboarding'
import Topbar from '@/shared/components/shell/Topbar'
import Sidebar from '@/shared/components/shell/Sidebar'
import LoadingScreen from '@/shared/components/shell/LoadingScreen'
import ShellLayout from '@/shared/components/shell/ShellLayout'
import ShellDrawer from '@/shared/components/shell/ShellDrawer'

type Props = {
  children: ReactNode
  title?: string
  actions?: ReactNode
  activeTab?: string
  onTabChange?: (tab: string) => void
}

/** The shell around every module: Sidebar, then a column with the Topbar over the page. The
 *  panel's state lives in Sidebar; here only the toggle of the phone drawer. */
export default function AppShell(props: Props) {
  const { children, title, actions } = props
  const { activeTab, onTabChange } = props
  const { loading } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeDrawer = () => setMobileOpen(false)

  if (loading) return <LoadingScreen />

  return (
    <ShellLayout part="root">
      <ShellDrawer open={mobileOpen} onClose={closeDrawer}>
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      </ShellDrawer>
      <ShellLayout part="column">
        <Topbar title={title} actions={actions} onHamburger={() => setMobileOpen(!mobileOpen)} />
        <ShellLayout part="content">{children}</ShellLayout>
      </ShellLayout>
      <Onboarding />
    </ShellLayout>
  )
}

// Every module mounts inside this shell. Its layout lives in ShellLayout's stylesheet, and the
// page's content is the one `main` of the screen.
