import type { BillingV2Record } from '@/shared/data'

/** The record the editor is open on —null means a new one—, and the day a new one starts on. */
export type OpenEditor = { record: BillingV2Record | null; day?: string }

/** Which sub-view is open — Records or Overview, decided by the sidebar in `BillingV2Module`. */
export type Props = { tab: string }

// Both shapes belong to `BillingV2Content` alone: `OpenEditor` tracks its own record-editor
// overlay, and `Props` is the one thing its parent hands it down. Split out only because a file
// with more than one type declaration hides the function under its own contract.
