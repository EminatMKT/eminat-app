'use client'
import { useApp } from '@/shared/context/AppContext'
import WorldClocks from '@/shared/components/shell/WorldClocks'
import TopbarDate from '@/shared/components/shell/TopbarDate'
import TopbarLayout from '@/shared/components/shell/TopbarLayout'
import s from './index.module.css'

type Props = {
  /** The page title remains available as a hover hint. */
  title?: string
}

export default function TopbarHeading({ title }: Props) {
  const { usuario, empresas } = useApp()
  const company = empresas.find(item => item.id === usuario?.empresa_id)?.nombre?.trim() || 'Organization'
  const firstName = usuario?.nombre?.trim().split(/\s+/)[0] || usuario?.apellido?.trim() || ''

  return (
    <TopbarLayout part="heading" title={title}>
      <TopbarLayout part="title">LILLY</TopbarLayout>
      <div className={s.signature}>Powered by Stratix Communications.</div>
      <TopbarLayout part="meta">
        <span className={s.welcome}>{company} — Welcome{firstName ? `, ${firstName}` : ''}</span>
        <TopbarDate />
        <WorldClocks />
      </TopbarLayout>
    </TopbarLayout>
  )
}

// The left side of the topbar: where the person is, today's date and the world's clocks.
