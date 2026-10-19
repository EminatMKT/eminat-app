import 'server-only'

/** Staged schema and data may exist before a controlled Sales cutover. */
export function nativeSalesEnabled(): boolean {
  return process.env.LILLY_NATIVE_SALES_ENABLED === 'true'
}
