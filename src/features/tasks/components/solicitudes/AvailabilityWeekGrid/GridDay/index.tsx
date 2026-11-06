'use client'
import { useT } from '@/shared/i18n'
import DayCaption from '../DayCaption'
import headerProps from './header-props'
import renderPreview from './render-preview'
import renderTrack from './render-track'
import trackAttrs from './track-attrs'
import trackInputOf from './track-input-of'
import useTrack from './use-track'
import type { GridDayProps } from '../types'
import type { TrackBundle, TrackInput } from './types'
import s from '../index.module.css'

function renderHeader(props: GridDayProps, trackInput: TrackInput) {
  return <DayCaption {...headerProps(props, trackInput)} />
}

function renderTrackSection(props: GridDayProps, track: TrackBundle) {
  return (
    <div {...trackAttrs(props, track)} data-grid-track>
      {renderTrack(props, track.trackInput)}
      {renderPreview(track.preview)}
    </div>
  )
}

function renderBody(props: GridDayProps, track: TrackBundle) {
  return <>
    <div className={s.header}>{renderHeader(props, track.trackInput)}</div>
    {renderTrackSection(props, track)}
  </>
}

/** One ISO weekday column: its caption (label, comparison, add control) and its create track,
 *  carrying one SegmentCanvas per range already declared on this day. */
export default function GridDay(props: GridDayProps) {
  const track = useTrack(props)
  const { t } = useT()
  const trackInput = trackInputOf(props, track.columnTop, t)
  const bundle = { ...track, trackInput }

  return <div className={s.day} data-grid-day>{renderBody(props, bundle)}</div>
}

// GridDay owns one weekday's filtering and track wiring; DayCaption and the track body stay
// unaware of the other six days this component also renders.
