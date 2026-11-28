/** Barrel for `src/shared/constants/`: re-exports every sibling file's public surface. */
export * from './domain'
export * from './dom'
export * from './contacts'
export { default as ADMIN_API } from './admin-api'
export { default as LIST_SEPARATOR } from './list-separator'

// This barrel lets a consumer that needs pieces from more than one sibling file import this
// directory once instead of importing each file apart; existing deep imports keep working.
