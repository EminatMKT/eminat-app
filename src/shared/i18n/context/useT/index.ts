'use client'
import { useContext } from 'react'
import LocaleContext from '../value'

/** Read the active locale and translator; using this hook outside its provider is a programming error. */
export default function useT() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('Wrap translation consumers in LocaleProvider.')
  return context
}

// Consumers share one provider contract rather than choosing independent fallback languages.
