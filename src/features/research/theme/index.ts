export { useDashboardTheme as useResearchTheme } from '@/shared/components/dashboard/theme'
export * from './constants'

// Barrel kept so Research's ~40 components keep importing one `theme` module.
// `useResearchTheme` now follows the app-wide toggle instead of a hardcoded light theme.
