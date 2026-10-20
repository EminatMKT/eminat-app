import type { ReactNode } from 'react'

type Base = {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  children: ReactNode
}

/** A checkbox is either enabled, or disabled and says why. The union keeps `hint` tied to
 *  `disabled: true`, so a disabled checkbox without a reason does not compile. Read the fields
 *  through the props object, not destructured, to keep that narrowing. */
export type Props = (Base & { disabled?: false }) | (Base & { disabled: true; hint: ReactNode })
