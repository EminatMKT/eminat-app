import 'server-only'

/** Staged schema and data may exist before a controlled Sales cutover. */
export function nativeSalesEnabled(): boolean {
  return process.env.LILLY_NATIVE_SALES_ENABLED === 'true'
}

/** Separate cutover switch: preview may run before /sales changes owners. */
export function nativeSalesPrimary(): boolean {
  return nativeSalesEnabled() && process.env.LILLY_NATIVE_SALES_PRIMARY === 'true'
}
