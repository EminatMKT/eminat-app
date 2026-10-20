/** Prevent Next.js from caching authenticated Supabase reads across requests. */
export const noStoreFetch: typeof fetch = Object.assign(
  (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, cache: 'no-store' }),
  { preconnect: fetch.preconnect },
)
