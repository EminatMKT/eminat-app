'use client'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { ReactNode, useRef, useEffect, useState } from 'react'

// ── Page wrapper: fadeIn + slideUp ──────────────────────────────────
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger container for card grids ────────────────────────────────
export function StaggerGrid({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      style={style}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger item (child of StaggerGrid) ─────────────────────────────
export function StaggerItem({ children, style, className, onClick }: { children: ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void }) {
  return (
    <motion.div
      style={style}
      className={className}
      onClick={onClick}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Fade in section (triggered on scroll) ───────────────────────────
export function FadeInSection({ children, style, delay = 0 }: { children: ReactNode; style?: React.CSSProperties; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

// ── Modal animation wrapper ─────────────────────────────────────────
export function ModalOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Animated counter for KPI numbers ────────────────────────────────
export function AnimatedNumber({ value, suffix = '', prefix = '', duration = 0.8 }: { value: number; suffix?: string; prefix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const end = value
    const startTime = performance.now()
    const dur = duration * 1000

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / dur, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, value, duration])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

// ── Table row animation ─────────────────────────────────────────────
export function AnimatedTableBody({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLTableSectionElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })
  return (
    <motion.tbody
      ref={ref}
      style={style}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {children}
    </motion.tbody>
  )
}

export function AnimatedRow({ children, style, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <motion.tr
      style={style}
      onClick={onClick}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.25 } },
      }}
    >
      {children}
    </motion.tr>
  )
}

export { motion, AnimatePresence }
