'use client'
import { AppProvider } from '@/shared/context/AppContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
