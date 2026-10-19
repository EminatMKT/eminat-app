/** One batched read of display names for the given ids: id → summary. */
export type LoadSummaries = (ids: string[]) => Promise<Record<string, string>>
