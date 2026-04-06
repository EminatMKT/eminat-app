'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DirectorioRedirect() {
  const router = useRouter()
  useEffect(() => { router.push('/') }, [])
  return null
}
