import type { RefObject } from 'react'

export type ValidationBannerProps = {
  message: string
  focusRef: RefObject<HTMLDivElement>
}
