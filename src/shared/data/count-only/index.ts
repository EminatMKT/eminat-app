/** `select` options for a count query: `head: true` means PostgREST never returns row data, only the match count. */
const COUNT_ONLY = { count: 'exact', head: true } as const

export default COUNT_ONLY

// COUNT_ONLY is the one shape every count-only read passes to `select`, so the dashboard counts,
// the delete-user task counts and the dedup queue count ask PostgREST the same way.
