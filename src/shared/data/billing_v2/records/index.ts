import type { BillingRecordInput } from '@/features/billing-v2/domain/types'
import { supabase } from '@/shared/db'
import { listAllRows } from '@/shared/data/paginated'
import { TABLES } from '@/shared/data/tables'
import billingRow from '../row'
import type { BillingV2Record } from '../types'

// The key pages are ordered by, and it has to be UNIQUE: on a repeated value a row can land on
// two pages or on none, and `range()` answers 200 either way, so nothing tells you.
const PAGE_ORDER = 'id'

// `amount` is asked for as text: PostgREST serialises `numeric` as a JSON number, and the cent
// value that decides what somebody gets paid must not become a float on the way back.
const READ = 'id,record_type,scheduled_on,scheduled_time,note_month,title,category,payment_status,payee_label,amount::text,currency_code,event_type_label,note_text,closing_approval_follow_up,created_by_id,created_at,updated_at'

async function list(): Promise<BillingV2Record[]> {
  try {
    return await listAllRows<BillingV2Record>(TABLES.billingV2Records, PAGE_ORDER, READ)
  } catch (cause) {
    throw new Error('Billing v2 records could not be read', { cause })
  }
}

async function create(input: BillingRecordInput): Promise<BillingV2Record> {
  const row = billingRow(input)
  const { data, error } = await supabase.from(TABLES.billingV2Records)
    .insert(row).select(READ).single()
  if (error) throw new Error('A billing v2 record could not be created', { cause: error })
  return data as BillingV2Record
}

async function update(id: string, input: BillingRecordInput): Promise<BillingV2Record> {
  const row = billingRow(input)
  const { data, error } = await supabase.from(TABLES.billingV2Records)
    .update(row).eq('id', id).select(READ).single()
  if (error) throw new Error('A billing v2 record could not be updated', { cause: error })
  return data as BillingV2Record
}

async function remove(id: string): Promise<void> {
  const { error } = await supabase.from(TABLES.billingV2Records).delete().eq('id', id)
  if (error) throw new Error('A billing v2 record could not be deleted', { cause: error })
}

const billingV2Records = { list, create, update, remove }

/** Every read and write of `billing_v2_records`, through the session-bound client so the RLS
 *  policies stay the access control, and validated before anything reaches the network. */
export default billingV2Records

// Every write reads the row back through the same column list as `list`, so a created or edited
// record reaches the screen in the shape the screen already knows, amount as text included.
// A failure keeps the database error as `cause` and never copies its text into the message.
