'use client'
import buildBannerAttrs from './banner-attrs'
import type { ValidationBannerProps } from './types'

/** The editable editor's validation summary: focus-targetable, announced assertively. */
export default function ValidationBanner(props: ValidationBannerProps) {
  const attrs = buildBannerAttrs(props)

  return <div {...attrs}>{props.message}</div>
}

// A thin rendering shell: banner-attrs owns which attributes make the summary accessible.
