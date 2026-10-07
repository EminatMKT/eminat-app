const EMPTY_NCT = ''

/** Normalizes an NCT# for comparison/indexing/querying: no spaces, uppercase. */
export default function normNct(v: unknown): string {
  return String(v ?? EMPTY_NCT).trim().toUpperCase()
}

// Single place to normalize a ClinicalTrials.gov NCT# before comparing, indexing or querying it.
