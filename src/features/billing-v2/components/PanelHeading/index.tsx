import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = { children: ReactNode }

export default function PanelHeading({ children }: Props) {
  return <h3 className={s.heading}>{children}</h3>
}

// The name of a panel of the billing screen — today, each of the two reminder groups. It is
// a real heading so a screen reader can jump between Overdue and Upcoming, and it sits one level
// under the screen's `h2` that `BillingBox` draws.
//
// It is its own unit and not another skin of `BillingBox` because that box already draws two
// tags, and a third one is where a view has to stop and name what it draws (`markup_dibujado`).
