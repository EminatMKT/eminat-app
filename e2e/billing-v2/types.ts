export type Row = Record<string, string | number | boolean | null>
export type IdRow = { id: string }

// A synthetic billing row as PostgREST receives it, and the ids a query answers with.
