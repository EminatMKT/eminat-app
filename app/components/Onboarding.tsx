'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  {
    target: '.sidebar-root',
    title: 'Navigation',
    description: 'Navigate between modules from here. Each icon takes you to a different section of the platform.',
    position: 'right' as const,
  },
  {
    target: '[data-tour="home"]',
    title: 'Home',
    description: 'View the status of all Eminat Holding brands in real time.',
    position: 'right' as const,
  },
  {
    target: '[data-tour="mkt"]',
    title: 'Stratix MKT',
    description: 'Manage tasks, production, kanban boards, social media and competitor analysis.',
    position: 'right' as const,
  },
  {
    target: '[data-tour="research"]',
    title: 'Research',
    description: 'Clinical trials CRM with pipeline, leads, newsletter and opportunities.',
    position: 'right' as const,
  },
  {
    target: '[data-tour="cobranzas"]',
    title: 'Billing',
    description: 'Financial dashboard with sales, accounts receivable and bank deposits.',
    position: 'right' as const,
  },
  {
    target: '[data-tour="medical"]',
    title: 'Medical',
    description: 'HIPAA-compliant management with patients, appointments, compliance and audit log.',
    position: 'right' as const,
  },
]

const STORAGE_KEY = 'eminat-onboarding-completed'

export default function Onboarding() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
        setActive(true)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const updateRect = useCallback(() => {
    const selector = STEPS[step]?.target
    if (!selector) return
    const el = document.querySelector(selector)
    if (el) {
      setRect(el.getBoundingClientRect())
    } else {
      setRect(null)
    }
  }, [step])

  useEffect(() => {
    if (!active) return
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [active, step, updateRect])

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }
  function prev() {
    if (step > 0) setStep(s => s - 1)
  }
  function finish() {
    setActive(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!active) return null

  const current = STEPS[step]
  const padding = 8

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    width: 320,
    maxWidth: 'calc(100vw - 32px)',
  }

  if (rect) {
    if (current.position === 'right') {
      tooltipStyle.left = rect.right + 16
      tooltipStyle.top = rect.top + rect.height / 2
      tooltipStyle.transform = 'translateY(-50%)'
    }
    // Fallback if off-screen right
    if ((rect.right + 16 + 320) > window.innerWidth) {
      tooltipStyle = {
        ...tooltipStyle,
        left: '50%',
        top: rect.bottom + 16,
        transform: 'translateX(-50%)',
      }
    }
  } else {
    tooltipStyle.left = '50%'
    tooltipStyle.top = '50%'
    tooltipStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
        {/* Dark overlay with cutout */}
        <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 10000 }}>
          <defs>
            <mask id="onboarding-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - padding}
                  y={rect.top - padding}
                  width={rect.width + padding * 2}
                  height={rect.height + padding * 2}
                  rx={12}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#onboarding-mask)"
          />
        </svg>

        {/* Highlight border */}
        {rect && (
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              left: rect.left - padding,
              top: rect.top - padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
              borderRadius: 12,
              border: '2px solid #7C6FF7',
              boxShadow: '0 0 0 4px rgba(124,111,247,0.2), 0 0 24px rgba(124,111,247,0.15)',
              zIndex: 10001,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          key={`tooltip-${step}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={tooltipStyle}
        >
          <div style={{
            background: '#111118',
            borderRadius: 16,
            padding: '24px 28px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 24 : 8,
                  height: 4,
                  borderRadius: 2,
                  background: i === step ? '#7C6FF7' : 'rgba(255,255,255,0.12)',
                  transition: 'all .3s',
                }} />
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono, monospace' }}>
                {step + 1}/{STEPS.length}
              </span>
            </div>

            {/* Content */}
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#FFFFFF', marginBottom: 8 }}>
              {current.title}
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 24 }}>
              {current.description}
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {step > 0 && (
                <button onClick={prev} style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}>
                  Back
                </button>
              )}
              <button onClick={next} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: '#7C6FF7', color: 'white', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>
                {step === STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
              <button onClick={finish} style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Skip tour
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
