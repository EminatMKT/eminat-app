import { billingV2Repo } from '@/shared/data'
import type { BillingRecordInput } from '@/features/billing-v2/domain/types'

async function save(id: string | null, input: BillingRecordInput): Promise<boolean> {
  try {
    if (id) {
      const updated = await billingV2Repo.update(id, input)
      return !!updated
    }
    const created = await billingV2Repo.create(input)
    return !!created
  } catch {
    return false
  }
}

async function drop(id: string): Promise<boolean> {
  try {
    await billingV2Repo.remove(id)
    return true
  } catch {
    return false
  }
}

const mutations = { save, drop }

/** The two writes the editor can ask for, each answering whether it landed. */
export default mutations

// A write that fails answers `false` instead of throwing at the screen, because the caller has
// something to protect in each case: a failed save has to keep every value the person typed, and
// a failed delete has to keep the row. Which one it was — create or update — is decided here by
// whether there is an id, so the editor asks for "save" and not for one of two operations.
