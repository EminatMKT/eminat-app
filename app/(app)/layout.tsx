'use client'
import { AppProvider } from '@/lib/AppContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
