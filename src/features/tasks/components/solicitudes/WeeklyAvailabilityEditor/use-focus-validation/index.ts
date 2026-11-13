'use client'
import { useEffect, useRef } from 'react'

const UNFOCUSED_TOKEN = 0

/** Owns the validation banner's focus ref and moves focus to it when the token advances. */
export default function useFocusValidation(token: number) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (token > UNFOCUSED_TOKEN) ref.current?.focus()
  }, [token])

  return ref
}

// Co-located so WeeklyAvailabilityEditor's view hook stays within its own line budget.
