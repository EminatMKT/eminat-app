'use client'
import { AppProvider } from '@/shared/context/AppContext'
import ModuleGate from '@/shared/components/access/ModuleGate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider><ModuleGate>{children}</ModuleGate></AppProvider>
}
