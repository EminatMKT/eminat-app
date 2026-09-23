'use client'
import { useBillingV1 } from './BillingV1Context'
import BillingV1Header from './BillingV1Header'
import BillingV1Tabs from './BillingV1Tabs'
import VentasTab from './VentasTab'
import CuentasTab from './CuentasTab'
import DepositosTab from './DepositosTab'
import ImportModal from './ImportModal'
import AddRecordModal from './AddRecordModal'

export default function BillingV1Content() {
  const { cobTab } = useBillingV1()
  const views = { ventas: <VentasTab />, cuentas: <CuentasTab />, depositos: <DepositosTab /> }
  return (
    <div>
      <BillingV1Header />
      <BillingV1Tabs />
      {views[cobTab]}
      <ImportModal />
      <AddRecordModal />
    </div>
  )
}
