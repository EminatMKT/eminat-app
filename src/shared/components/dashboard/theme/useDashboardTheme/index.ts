import { useApp } from '@/shared/context/AppContext'

/** Live dashboard theme tokens, derived from AppContext so they follow the light/dark toggle. */
export default function useDashboardTheme() {
  const { bg, s1, s2, s3, border, t1, t2, t3, accent, inputStyle } = useApp()
  const theme = {
    bg,
    s1,
    s2,
    s3,
    border,
    t1,
    t2,
    t3,
    accent,
    inputStyle,
    warn: '#FBBF24',
  }
  return theme
}

// Reads the AppContext color tokens on every call, so the dashboard's shared pieces repaint
// with the toggle instead of a frozen palette.
