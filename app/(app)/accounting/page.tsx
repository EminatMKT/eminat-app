'use client'
import { useState, useMemo } from 'react'
import AppShell from '@/app/components/AppShell'

const COLORS = {
  bg: '#0b0b1e',
  card: '#13132a',
  border: 'rgba(255,255,255,0.08)',
  purple: '#6c5ce7',
  teal: '#00cec9',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.6)',
  dim: 'rgba(255,255,255,0.35)',
}

const ventas = [
  {mes:'MARZO',periodo:'1Q',lab:'NOVARTIS',estudio:'CTQJ230A12304',monto:3000},
  {mes:'MARZO',periodo:'1Q',lab:'NOVARTIS',estudio:'CKJX839D12302 VICTORION-1',monto:12152},
  {mes:'MARZO',periodo:'1Q',lab:'NOVARTIS',estudio:'CKJX839B12302 VICTORION-2',monto:1035},
  {mes:'MARZO',periodo:'1Q',lab:'NOVARTIS',estudio:'CTQJ230A12305B',monto:0},
  {mes:'MARZO',periodo:'1Q',lab:'NOVARTIS',estudio:'CTQJ230A12303',monto:0},
  {mes:'MARZO',periodo:'1Q',lab:'MERCK',estudio:'015-00',monto:6502},
  {mes:'MARZO',periodo:'1Q',lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',monto:8427.79},
  {mes:'MARZO',periodo:'1Q',lab:'AMGEN',estudio:'20230222',monto:0},
  {mes:'MARZO',periodo:'1Q',lab:'MT GROUP',estudio:'2246',monto:14000},
  {mes:'MARZO',periodo:'1Q',lab:'MT GROUP',estudio:'2250',monto:4500},
  {mes:'MARZO',periodo:'1Q',lab:'MT GROUP',estudio:'1410',monto:525},
  {mes:'MARZO',periodo:'1Q',lab:'MT GROUP',estudio:'1828',monto:3200},
  {mes:'MARZO',periodo:'1Q',lab:'RDI',estudio:'2859',monto:9500},
  {mes:'MARZO',periodo:'2Q',lab:'NOVARTIS',estudio:'CTQJ230A12304',monto:13494},
  {mes:'MARZO',periodo:'2Q',lab:'NOVARTIS',estudio:'CKJX839D12302 VICTORION-1',monto:15190},
  {mes:'MARZO',periodo:'2Q',lab:'NOVARTIS',estudio:'CKJX839B12302 VICTORION-2',monto:1499.60},
  {mes:'MARZO',periodo:'2Q',lab:'NOVARTIS',estudio:'CTQJ230A12305B',monto:5825},
  {mes:'MARZO',periodo:'2Q',lab:'NOVARTIS',estudio:'CTQJ230A12303',monto:2800},
  {mes:'MARZO',periodo:'2Q',lab:'MERCK',estudio:'015-00',monto:9393},
  {mes:'MARZO',periodo:'2Q',lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',monto:10196.25},
  {mes:'MARZO',periodo:'2Q',lab:'AMGEN',estudio:'20230222',monto:6670.40},
  {mes:'MARZO',periodo:'2Q',lab:'RDI',estudio:'2859',monto:3600},
  {mes:'MARZO',periodo:'2Q',lab:'PHARMA COSMOS A/S',estudio:'P-MONOFER-CHF-02',monto:5018},
]

const porCobrar = [
  {lab:'AMGEN',estudio:'20230222',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:9598.75,total:9598.75},
  {lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:25316.47,total:25316.47},
  {lab:'MERCK',estudio:'015-00',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:11879,total:11879},
  {lab:'NOVARTIS',estudio:'CTQJ230A12304',tipo:'DATA',periodo:'2Q',vencido:27000,porVencer:12000,total:39000},
  {lab:'NOVARTIS',estudio:'CKJX839D12302 VICTORION-1',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:21266,total:21266},
  {lab:'NOVARTIS',estudio:'CKJX839B12302 VICTORION-2',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:2534.6,total:2534.6},
  {lab:'NOVARTIS',estudio:'CTQJ230A12305B',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:2150,total:2150},
  {lab:'NOVARTIS',estudio:'CTQJ230A12303',tipo:'DATA',periodo:'2Q',vencido:3000,porVencer:5800,total:8800},
  {lab:'RDI',estudio:'2859',tipo:'DATA',periodo:'2Q',vencido:68900,porVencer:55900,total:124800},
  {lab:'RDI',estudio:'2791',tipo:'DATA',periodo:'2Q',vencido:1200,porVencer:0,total:1200},
  {lab:'RDI',estudio:'2794',tipo:'DATA',periodo:'2Q',vencido:600,porVencer:0,total:600},
  {lab:'MT GROUP',estudio:'2250',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:4500,total:4500},
  {lab:'MT GROUP',estudio:'1828',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:3200,total:3200},
  {lab:'MT GROUP',estudio:'2246',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:14000,total:14000},
  {lab:'MT GROUP',estudio:'1410',tipo:'DATA',periodo:'2Q',vencido:0,porVencer:525,total:525},
  {lab:'PHARMA COSMOS A/S',estudio:'P-MONOFER-CHF-02',tipo:'DATA',periodo:'2Q',vencido:2509,porVencer:5018,total:7527},
  {lab:'F. HOFFMANN-LA ROCHE',estudio:'GA45332 - CD',tipo:'DATA',periodo:'2Q',vencido:2502,porVencer:0,total:2502},
  {lab:'F. HOFFMANN-LA ROCHE',estudio:'GA45329 - UC',tipo:'DATA',periodo:'2Q',vencido:2453,porVencer:0,total:2453},
  {lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',tipo:'INVOICE',periodo:'2Q',vencido:6156.15,porVencer:600,total:6756.15},
  {lab:'MERCK',estudio:'015-00',tipo:'INVOICE',periodo:'2Q',vencido:900,porVencer:0,total:900},
  {lab:'RDI',estudio:'2656',tipo:'INVOICE',periodo:'2Q',vencido:840,porVencer:0,total:840},
  {lab:'RDI',estudio:'2741',tipo:'INVOICE',periodo:'2Q',vencido:840,porVencer:0,total:840},
  {lab:'RDI',estudio:'2794',tipo:'INVOICE',periodo:'2Q',vencido:630,porVencer:0,total:630},
  {lab:'RDI',estudio:'2859',tipo:'INVOICE',periodo:'2Q',vencido:0,porVencer:2380,total:2380},
]

const depositos = [
  {dia:2,periodo:'1Q',contratante:'ELIAS RESEARCH',lab:'NOVARTIS',estudio:'CKJX839B12302 VICTORION-2',banco:'SOUTH STATE',monto:2160},
  {dia:2,periodo:'1Q',contratante:'ELIAS RESEARCH',lab:'MERCK',estudio:'015-00',banco:'SOUTH STATE',monto:1000},
  {dia:2,periodo:'1Q',contratante:'PHARMACEUTICAL RESEARCH - ICON',lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',banco:'SOUTH STATE',monto:2612.5},
  {dia:6,periodo:'1Q',contratante:'PHARMACEUTICAL RESEARCH - ICON',lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',banco:'SOUTH STATE',monto:6938.32},
  {dia:12,periodo:'1Q',contratante:'PHARMACEUTICAL RESEARCH - ICON',lab:'INVENTIVA PHARMA',estudio:'337HNAS20011 (NATiV3)',banco:'SOUTH STATE',monto:981.11},
  {dia:16,periodo:'2Q',contratante:'ELIAS RESEARCH',lab:'NOVARTIS',estudio:'CKJX839B12302 VICTORION-2',banco:'SOUTH STATE',monto:2999.2},
  {dia:16,periodo:'2Q',contratante:'ELIAS RESEARCH',lab:'MERCK',estudio:'015-00',banco:'SOUTH STATE',monto:20168.88},
  {dia:17,periodo:'2Q',contratante:'MT GROUP',lab:'MT GROUP',estudio:'MT2250',banco:'SPACE COAST',monto:18000},
  {dia:17,periodo:'2Q',contratante:'MT GROUP',lab:'MT GROUP',estudio:'MT3795',banco:'SPACE COAST',monto:5600},
  {dia:17,periodo:'2Q',contratante:'MT GROUP',lab:'MT GROUP',estudio:'MT2234',banco:'SPACE COAST',monto:4800},
  {dia:19,periodo:'2Q',contratante:'NOVARTIS',lab:'NOVARTIS',estudio:'CTQJ230A12305B',banco:'SPACE COAST',monto:3300},
  {dia:19,periodo:'2Q',contratante:'NOVARTIS',lab:'NOVARTIS',estudio:'CKJX839D12302 VICTORION-1',banco:'SPACE COAST',monto:18228},
  {dia:30,periodo:'2Q',contratante:'ELIAS RESEARCH',lab:'MERCK',estudio:'015-00',banco:'SOUTH STATE',monto:2486},
]

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type TabKey = 'summary' | 'sales' | 'receivables' | 'banking' | 'labs'

export default function AccountingPage() {
  const [tab, setTab] = useState<TabKey>('summary')

  const totals = useMemo(() => {
    const totalVentas = ventas.reduce((a, b) => a + b.monto, 0)
    const totalVencido = porCobrar.reduce((a, b) => a + b.vencido, 0)
    const totalPorVencer = porCobrar.reduce((a, b) => a + b.porVencer, 0)
    const totalCobrar = totalVencido + totalPorVencer
    const totalDepositos = depositos.reduce((a, b) => a + b.monto, 0)
    return { totalVentas, totalVencido, totalPorVencer, totalCobrar, totalDepositos }
  }, [])

  const ventasPorLab = useMemo(() => {
    const m: Record<string, number> = {}
    ventas.forEach(v => { m[v.lab] = (m[v.lab] || 0) + v.monto })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [])

  const depositosPorBanco = useMemo(() => {
    const m: Record<string, number> = {}
    depositos.forEach(d => { m[d.banco] = (m[d.banco] || 0) + d.monto })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [])

  const labStats = useMemo(() => {
    const m: Record<string, { ventas: number; cobrar: number; depositado: number }> = {}
    ventas.forEach(v => { if (!m[v.lab]) m[v.lab] = { ventas: 0, cobrar: 0, depositado: 0 }; m[v.lab].ventas += v.monto })
    porCobrar.forEach(p => { if (!m[p.lab]) m[p.lab] = { ventas: 0, cobrar: 0, depositado: 0 }; m[p.lab].cobrar += p.total })
    depositos.forEach(d => { if (!m[d.lab]) m[d.lab] = { ventas: 0, cobrar: 0, depositado: 0 }; m[d.lab].depositado += d.monto })
    return Object.entries(m).sort((a, b) => b[1].ventas - a[1].ventas)
  }, [])

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'summary', label: 'Summary', icon: '📊' },
    { key: 'sales', label: 'Sales', icon: '💵' },
    { key: 'receivables', label: 'Receivables', icon: '📥' },
    { key: 'banking', label: 'Banking', icon: '🏦' },
    { key: 'labs', label: 'Laboratories', icon: '🧪' },
  ]

  return (
    <AppShell>
      <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100%', margin: '-20px -24px', padding: '24px 28px', fontFamily: 'DM Sans, sans-serif' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Accounting</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Eminat Research · Sales, receivables & banking — March</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <KPI label="Total Sales" value={fmt(totals.totalVentas)} accent={COLORS.purple} />
            <KPI label="Receivables" value={fmt(totals.totalCobrar)} accent={COLORS.teal} />
            <KPI label="Deposits" value={fmt(totals.totalDepositos)} accent="#34D399" />
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 0, overflowX: 'auto' }}>
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: '10px 10px 0 0',
                  border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                  background: active ? COLORS.card : 'transparent',
                  color: active ? COLORS.teal : COLORS.muted,
                  borderBottom: active ? `2px solid ${COLORS.teal}` : '2px solid transparent',
                  transition: 'all .15s', whiteSpace: 'nowrap',
                }}>
                <span>{t.icon}</span>{t.label}
              </button>
            )
          })}
        </div>

        {tab === 'summary' && <SummaryTab totals={totals} ventasPorLab={ventasPorLab} depositosPorBanco={depositosPorBanco} />}
        {tab === 'sales' && <SalesTab />}
        {tab === 'receivables' && <ReceivablesTab />}
        {tab === 'banking' && <BankingTab />}
        {tab === 'labs' && <LabsTab labStats={labStats} />}
      </div>
    </AppShell>
  )
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 18px', minWidth: 150 }}>
      <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent, fontFamily: 'Syne, sans-serif', marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: COLORS.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: COLORS.text, fontWeight: 500 }}>{label}</span>
        <span style={{ color: COLORS.muted, fontFamily: 'DM Mono, monospace' }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 6, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

function SummaryTab({ totals, ventasPorLab, depositosPorBanco }: any) {
  const maxLab = Math.max(...ventasPorLab.map((x: any) => x[1]))
  const maxBanco = Math.max(...depositosPorBanco.map((x: any) => x[1]))
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <StatBlock title="Sales 1Q" value={fmt(ventas.filter(v => v.periodo === '1Q').reduce((a, b) => a + b.monto, 0))} color={COLORS.purple} />
        <StatBlock title="Sales 2Q" value={fmt(ventas.filter(v => v.periodo === '2Q').reduce((a, b) => a + b.monto, 0))} color={COLORS.teal} />
        <StatBlock title="Overdue" value={fmt(totals.totalVencido)} color="#F87171" />
        <StatBlock title="Not Yet Due" value={fmt(totals.totalPorVencer)} color="#FBBF24" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <Card title="Sales by Laboratory" subtitle="March, all periods">
          {ventasPorLab.map(([lab, val]: any) => <Bar key={lab} label={lab} value={val} max={maxLab} color={COLORS.purple} />)}
        </Card>
        <Card title="Deposits by Bank" subtitle="March, all periods">
          {depositosPorBanco.map(([banco, val]: any) => <Bar key={banco} label={banco} value={val} max={maxBanco} color={COLORS.teal} />)}
        </Card>
      </div>
    </div>
  )
}

function StatBlock({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'Syne, sans-serif', marginTop: 6 }}>{value}</div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ padding: '10px 12px', textAlign: align, fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${COLORS.border}` }}>{children}</th>
}
function Td({ children, align = 'left', mono = false, color }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean; color?: string }) {
  return <td style={{ padding: '10px 12px', textAlign: align, fontSize: 12, color: color || COLORS.text, borderBottom: `1px solid ${COLORS.border}`, fontFamily: mono ? 'DM Mono, monospace' : 'DM Sans' }}>{children}</td>
}

function SalesTab() {
  const [periodo, setPeriodo] = useState<'all' | '1Q' | '2Q'>('all')
  const filtered = ventas.filter(v => periodo === 'all' || v.periodo === periodo)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <Card title="Sales — March" subtitle={`${filtered.length} records · ${fmt(total)}`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', '1Q', '2Q'] as const).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${periodo === p ? COLORS.purple : COLORS.border}`, background: periodo === p ? `${COLORS.purple}22` : 'transparent', color: periodo === p ? COLORS.purple : COLORS.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {p === 'all' ? 'All' : p}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Month</Th><Th>Period</Th><Th>Lab</Th><Th>Study</Th><Th align="right">Amount</Th></tr></thead>
          <tbody>
            {filtered.map((v, i) => (
              <tr key={i}><Td>{v.mes}</Td><Td color={COLORS.teal} mono>{v.periodo}</Td><Td>{v.lab}</Td><Td color={COLORS.muted}>{v.estudio}</Td><Td align="right" mono color={v.monto > 0 ? COLORS.text : COLORS.dim}>{fmt(v.monto)}</Td></tr>
            ))}
            <tr><Td><strong>TOTAL</strong></Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td align="right" mono color={COLORS.purple}><strong>{fmt(total)}</strong></Td></tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ReceivablesTab() {
  const [tipo, setTipo] = useState<'all' | 'DATA' | 'INVOICE'>('all')
  const filtered = porCobrar.filter(p => tipo === 'all' || p.tipo === tipo)
  const totV = filtered.reduce((a, b) => a + b.vencido, 0)
  const totPV = filtered.reduce((a, b) => a + b.porVencer, 0)
  const totT = filtered.reduce((a, b) => a + b.total, 0)
  return (
    <Card title="Receivables" subtitle={`${filtered.length} records · ${fmt(totT)} outstanding`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'DATA', 'INVOICE'] as const).map(t => (
          <button key={t} onClick={() => setTipo(t)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${tipo === t ? COLORS.teal : COLORS.border}`, background: tipo === t ? `${COLORS.teal}22` : 'transparent', color: tipo === t ? COLORS.teal : COLORS.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Lab</Th><Th>Study</Th><Th>Type</Th><Th>Period</Th><Th align="right">Overdue</Th><Th align="right">Not Due</Th><Th align="right">Total</Th></tr></thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i}>
                <Td>{p.lab}</Td>
                <Td color={COLORS.muted}>{p.estudio}</Td>
                <Td color={p.tipo === 'DATA' ? COLORS.teal : COLORS.purple} mono>{p.tipo}</Td>
                <Td mono>{p.periodo}</Td>
                <Td align="right" mono color={p.vencido > 0 ? '#F87171' : COLORS.dim}>{fmt(p.vencido)}</Td>
                <Td align="right" mono color={p.porVencer > 0 ? '#FBBF24' : COLORS.dim}>{fmt(p.porVencer)}</Td>
                <Td align="right" mono>{fmt(p.total)}</Td>
              </tr>
            ))}
            <tr>
              <Td><strong>TOTAL</strong></Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
              <Td align="right" mono color="#F87171"><strong>{fmt(totV)}</strong></Td>
              <Td align="right" mono color="#FBBF24"><strong>{fmt(totPV)}</strong></Td>
              <Td align="right" mono color={COLORS.teal}><strong>{fmt(totT)}</strong></Td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function BankingTab() {
  const [banco, setBanco] = useState<'all' | 'SOUTH STATE' | 'SPACE COAST'>('all')
  const filtered = depositos.filter(d => banco === 'all' || d.banco === banco)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <Card title="Bank Deposits — March" subtitle={`${filtered.length} deposits · ${fmt(total)}`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'SOUTH STATE', 'SPACE COAST'] as const).map(b => (
          <button key={b} onClick={() => setBanco(b)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${banco === b ? COLORS.teal : COLORS.border}`, background: banco === b ? `${COLORS.teal}22` : 'transparent', color: banco === b ? COLORS.teal : COLORS.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {b === 'all' ? 'All Banks' : b}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Day</Th><Th>Period</Th><Th>Payer</Th><Th>Lab</Th><Th>Study</Th><Th>Bank</Th><Th align="right">Amount</Th></tr></thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i}>
                <Td mono>{d.dia}</Td>
                <Td color={COLORS.teal} mono>{d.periodo}</Td>
                <Td>{d.contratante}</Td>
                <Td>{d.lab}</Td>
                <Td color={COLORS.muted}>{d.estudio}</Td>
                <Td color={COLORS.purple}>{d.banco}</Td>
                <Td align="right" mono color="#34D399">{fmt(d.monto)}</Td>
              </tr>
            ))}
            <tr>
              <Td><strong>TOTAL</strong></Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
              <Td align="right" mono color="#34D399"><strong>{fmt(total)}</strong></Td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function LabsTab({ labStats }: any) {
  const maxV = Math.max(...labStats.map((x: any) => x[1].ventas))
  return (
    <Card title="Laboratory Performance" subtitle="Sales · Receivables · Deposits per lab">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Lab</Th><Th align="right">Sales</Th><Th align="right">Receivables</Th><Th align="right">Deposits</Th><Th>Performance</Th></tr></thead>
          <tbody>
            {labStats.map(([lab, s]: any) => {
              const pct = maxV > 0 ? (s.ventas / maxV) * 100 : 0
              return (
                <tr key={lab}>
                  <Td>{lab}</Td>
                  <Td align="right" mono color={COLORS.purple}>{fmt(s.ventas)}</Td>
                  <Td align="right" mono color={COLORS.teal}>{fmt(s.cobrar)}</Td>
                  <Td align="right" mono color="#34D399">{fmt(s.depositado)}</Td>
                  <Td>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', minWidth: 120 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.teal})`, borderRadius: 4 }} />
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
