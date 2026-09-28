'use client'
import type { BillingV2Record } from '@/shared/data'
import BillingBox from '@/features/billing-v2/components/BillingBox'
import PanelHeading from '@/features/billing-v2/components/PanelHeading'
import ReminderItem from '@/features/billing-v2/components/ReminderItem'

type Props = {
  /** The group's name, already translated. */
  title: string
  /** What the group says when it holds nothing, already translated. */
  empty: string
  records: readonly BillingV2Record[]
  onOpen: (record: BillingV2Record) => void
}

export default function ReminderGroup({ title, empty, records, onOpen }: Props) {
  return (
    <BillingBox part="records">
      <PanelHeading>{title}</PanelHeading>
      {records.length === 0 && <BillingBox part="hint">{empty}</BillingBox>}
      {records.map((record) => <ReminderItem key={record.id} record={record} onOpen={onOpen} />)}
    </BillingBox>
  )
}

// One of the two reminder groups, Overdue or Upcoming, under its own heading. It never hides
// when it is empty: "no overdue payments" is the answer somebody opened the screen for, and a
// group that vanishes cannot be told apart from one that failed to draw.
