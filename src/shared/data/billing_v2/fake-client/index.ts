type FakeChain = {
  select: (columns?: string) => FakeChain
  order: (column: string) => FakeChain
  range: (from: number, to: number) => FakeChain
  eq: (column: string, value: string) => FakeChain
  single: () => FakeChain
  insert: (row: unknown) => FakeChain
  update: (row: unknown) => FakeChain
  delete: () => FakeChain
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>
}

const NO_ROWS = { data: [], error: null }
const VERB = { single: 'single', insert: 'insert', update: 'update', delete: 'delete' }

/** A stand-in for the session-bound Supabase client. It answers one queued reply per awaited
 *  query and records every call, so a suite can prove what was asked — or that nothing was. */
export default function fakeClient(replies: unknown[]) {
  const calls: string[] = []
  const sent: unknown[] = []
  let answered = 0
  const chain: FakeChain = {
    select: (columns = '') => { calls.push(`select:${columns}`); return chain },
    order: (column) => { calls.push(`order:${column}`); return chain },
    range: (from, to) => { calls.push(`range:${from}:${to}`); return chain },
    eq: (column, value) => { calls.push(`eq:${column}:${value}`); return chain },
    single: () => { calls.push(VERB.single); return chain },
    insert: (row) => { calls.push(VERB.insert); sent.push(row); return chain },
    update: (row) => { calls.push(VERB.update); sent.push(row); return chain },
    delete: () => { calls.push(VERB.delete); return chain },
    then: (resolve) => Promise.resolve(replies[answered++] ?? NO_ROWS).then(resolve),
  }
  const from = (table: string) => { calls.push(`from:${table}`); return chain }
  const client = { from, calls, sent }
  return client
}

// One chain object serves the whole query: what a suite needs is the transcript, not a faithful
// builder. Replies are consumed one per await, which is what lets a paged read be scripted page
// by page; once they run out every further await answers an empty page, so a loop terminates.
