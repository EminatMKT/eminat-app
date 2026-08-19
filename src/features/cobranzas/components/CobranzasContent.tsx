'use client'
import { useCobranzas } from './CobranzasContext'
import CobranzasHeader from './CobranzasHeader'
import CobranzasTabs from './CobranzasTabs'
import VentasTab from './VentasTab'
import CuentasTab from './CuentasTab'
import DepositosTab from './DepositosTab'
import ImportModal from './ImportModal'
import AddRecordModal from './AddRecordModal'

export default function CobranzasContent() {
  const { cobTab } = useCobranzas()
  const views = { ventas: <VentasTab />, cuentas: <CuentasTab />, depositos: <DepositosTab /> }
  return (
    <div>
      <CobranzasHeader />
      <CobranzasTabs />
      {views[cobTab]}
      <ImportModal />
      <AddRecordModal />
    </div>
  )
}
