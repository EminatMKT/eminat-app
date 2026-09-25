import type { ReactNode } from 'react'

type Props = { children: ReactNode }

export default function FallbackDocument({ children }: Props) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

// The `<html>` and `<body>` that `global-error` draws when the root layout itself broke. It
// leaves out the root layout's `next/font` on purpose: what failed may be that layout, and
// `globals.css` already falls back to a system font.
