'use client'
import { useState, useMemo } from 'react'
import AppShell from '@/app/components/AppShell'

const ACCENT = {
  purple: '#6c5ce7',
  teal: '#00cec9',
  red: '#e17055',
  yellow: '#fdcb6e',
  green: '#10b981',
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
      <div className="-mx-6 -my-5 min-h-full bg-gray-50 px-7 py-6">
        {/* HEADER */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Accounting</h1>
            <p className="mt-1 text-xs text-gray-500">Eminat Research · Sales, receivables & banking — March</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <KPI label="Total Sales" value={fmt(totals.totalVentas)} accent={ACCENT.purple} />
            <KPI label="Receivables" value={fmt(totals.totalCobrar)} accent={ACCENT.teal} />
            <KPI label="Deposits" value={fmt(totals.totalDepositos)} accent={ACCENT.green} />
          </div>
        </div>

        {/* TABS */}
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-gray-200">
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border-b-2 bg-white text-gray-900'
                    : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={active ? { borderBottomColor: ACCENT.teal, color: ACCENT.teal } : undefined}
              >
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
    <div className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-base font-bold text-gray-900">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-mono text-gray-500">{fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      </div>
    </div>
  )
}

function SummaryTab({ totals, ventasPorLab, depositosPorBanco }: any) {
  const maxLab = Math.max(...ventasPorLab.map((x: any) => x[1]))
  const maxBanco = Math.max(...depositosPorBanco.map((x: any) => x[1]))
  return (
    <div>
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatBlock title="Sales 1Q" value={fmt(ventas.filter(v => v.periodo === '1Q').reduce((a, b) => a + b.monto, 0))} color={ACCENT.purple} />
        <StatBlock title="Sales 2Q" value={fmt(ventas.filter(v => v.periodo === '2Q').reduce((a, b) => a + b.monto, 0))} color={ACCENT.teal} />
        <StatBlock title="Overdue" value={fmt(totals.totalVencido)} color={ACCENT.red} />
        <StatBlock title="Not Yet Due" value={fmt(totals.totalPorVencer)} color={ACCENT.yellow} />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <Card title="Sales by Laboratory" subtitle="March, all periods">
          {ventasPorLab.map(([lab, val]: any) => <Bar key={lab} label={lab} value={val} max={maxLab} color={ACCENT.purple} />)}
        </Card>
        <Card title="Deposits by Bank" subtitle="March, all periods">
          {depositosPorBanco.map(([banco, val]: any) => <Bar key={banco} label={banco} value={val} max={maxBanco} color={ACCENT.teal} />)}
        </Card>
      </div>
    </div>
  )
}

function StatBlock({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title}</div>
      <div className="mt-1.5 text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

function FilterBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition"
      style={active
        ? { borderColor: color, background: `${color}15`, color }
        : { borderColor: '#e5e7eb', background: 'white', color: '#6b7280' }}>
      {children}
    </button>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
}
function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className="border-b border-gray-200 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ textAlign: align }}>{children}</th>
}
function Td({ children, align = 'left', mono = false, color, bold = false }: { children: React.ReactNode; align?: 'left' | 'right'; mono?: boolean; color?: string; bold?: boolean }) {
  return <td className={`border-b border-gray-100 px-3 py-2.5 text-xs ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`} style={{ textAlign: align, color: color || '#111827' }}>{children}</td>
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-gray-50">{children}</tr>
}

function SalesTab() {
  const [periodo, setPeriodo] = useState<'all' | '1Q' | '2Q'>('all')
  const filtered = ventas.filter(v => periodo === 'all' || v.periodo === periodo)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <Card title="Sales — March" subtitle={`${filtered.length} records · ${fmt(total)}`}>
      <div className="mb-3 flex gap-1.5">
        {(['all', '1Q', '2Q'] as const).map(p => (
          <FilterBtn key={p} active={periodo === p} color={ACCENT.purple} onClick={() => setPeriodo(p)}>
            {p === 'all' ? 'All' : p}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Month</Th><Th>Period</Th><Th>Lab</Th><Th>Study</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          {filtered.map((v, i) => (
            <Tr key={i}>
              <Td>{v.mes}</Td>
              <Td color={ACCENT.teal} mono bold>{v.periodo}</Td>
              <Td bold>{v.lab}</Td>
              <Td color="#6b7280">{v.estudio}</Td>
              <Td align="right" mono color={v.monto > 0 ? '#111827' : '#9ca3af'}>{fmt(v.monto)}</Td>
            </Tr>
          ))}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.purple}>{fmt(total)}</Td>
          </tr>
        </tbody>
      </TableWrap>
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
      <div className="mb-3 flex gap-1.5">
        {(['all', 'DATA', 'INVOICE'] as const).map(t => (
          <FilterBtn key={t} active={tipo === t} color={ACCENT.teal} onClick={() => setTipo(t)}>
            {t === 'all' ? 'All' : t}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Lab</Th><Th>Study</Th><Th>Type</Th><Th>Period</Th><Th align="right">Overdue</Th><Th align="right">Not Due</Th><Th align="right">Total</Th></tr></thead>
        <tbody>
          {filtered.map((p, i) => (
            <Tr key={i}>
              <Td bold>{p.lab}</Td>
              <Td color="#6b7280">{p.estudio}</Td>
              <Td>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{
                  background: p.tipo === 'DATA' ? `${ACCENT.teal}1f` : `${ACCENT.purple}1f`,
                  color: p.tipo === 'DATA' ? ACCENT.teal : ACCENT.purple,
                }}>{p.tipo}</span>
              </Td>
              <Td mono>{p.periodo}</Td>
              <Td align="right" mono color={p.vencido > 0 ? ACCENT.red : '#9ca3af'}>{fmt(p.vencido)}</Td>
              <Td align="right" mono color={p.porVencer > 0 ? '#b45309' : '#9ca3af'}>{fmt(p.porVencer)}</Td>
              <Td align="right" mono bold>{fmt(p.total)}</Td>
            </Tr>
          ))}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.red}>{fmt(totV)}</Td>
            <Td align="right" mono bold color="#b45309">{fmt(totPV)}</Td>
            <Td align="right" mono bold color={ACCENT.teal}>{fmt(totT)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </Card>
  )
}

function BankingTab() {
  const [banco, setBanco] = useState<'all' | 'SOUTH STATE' | 'SPACE COAST'>('all')
  const filtered = depositos.filter(d => banco === 'all' || d.banco === banco)
  const total = filtered.reduce((a, b) => a + b.monto, 0)
  return (
    <Card title="Bank Deposits — March" subtitle={`${filtered.length} deposits · ${fmt(total)}`}>
      <div className="mb-3 flex gap-1.5">
        {(['all', 'SOUTH STATE', 'SPACE COAST'] as const).map(b => (
          <FilterBtn key={b} active={banco === b} color={ACCENT.teal} onClick={() => setBanco(b)}>
            {b === 'all' ? 'All Banks' : b}
          </FilterBtn>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Day</Th><Th>Period</Th><Th>Payer</Th><Th>Lab</Th><Th>Study</Th><Th>Bank</Th><Th align="right">Amount</Th></tr></thead>
        <tbody>
          {filtered.map((d, i) => (
            <Tr key={i}>
              <Td mono bold>{d.dia}</Td>
              <Td color={ACCENT.teal} mono>{d.periodo}</Td>
              <Td>{d.contratante}</Td>
              <Td bold>{d.lab}</Td>
              <Td color="#6b7280">{d.estudio}</Td>
              <Td>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${ACCENT.purple}1f`, color: ACCENT.purple }}>{d.banco}</span>
              </Td>
              <Td align="right" mono bold color={ACCENT.green}>{fmt(d.monto)}</Td>
            </Tr>
          ))}
          <tr className="bg-gray-50">
            <Td bold>TOTAL</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
            <Td align="right" mono bold color={ACCENT.green}>{fmt(total)}</Td>
          </tr>
        </tbody>
      </TableWrap>
    </Card>
  )
}

function LabsTab({ labStats }: any) {
  const maxV = Math.max(...labStats.map((x: any) => x[1].ventas))
  return (
    <Card title="Laboratory Performance" subtitle="Sales · Receivables · Deposits per lab">
      <TableWrap>
        <thead><tr><Th>Lab</Th><Th align="right">Sales</Th><Th align="right">Receivables</Th><Th align="right">Deposits</Th><Th>Performance</Th></tr></thead>
        <tbody>
          {labStats.map(([lab, s]: any) => {
            const pct = maxV > 0 ? (s.ventas / maxV) * 100 : 0
            return (
              <Tr key={lab}>
                <Td bold>{lab}</Td>
                <Td align="right" mono color={ACCENT.purple}>{fmt(s.ventas)}</Td>
                <Td align="right" mono color={ACCENT.teal}>{fmt(s.cobrar)}</Td>
                <Td align="right" mono color={ACCENT.green}>{fmt(s.depositado)}</Td>
                <Td>
                  <div className="h-1.5 min-w-[120px] overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ACCENT.purple}, ${ACCENT.teal})` }} />
                  </div>
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </TableWrap>
    </Card>
  )
}
