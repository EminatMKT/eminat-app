'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { BarChart3, ListTodo, Orbit, Users, Zap } from 'lucide-react'
import { useT } from '@/shared/i18n'
import styles from './login.module.css'
import LaunchpadTablet from './LaunchpadTablet'

const features = [
  { icon: ListTodo, key: 'login.benefitTasks' },
  { icon: Users, key: 'login.benefitTeam' },
  { icon: BarChart3, key: 'login.benefitProgress' },
  { icon: Zap, key: 'login.benefitProjects' },
] as const

/** Decorative layers only. Pointer motion never changes the form or application state. */
export default function LoginHero() {
  const { t } = useT()
  const scene = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = scene.current
    if (!element) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    let x = 0
    let y = 0
    const paint = () => {
      element.style.setProperty('--pointer-x', String(x))
      element.style.setProperty('--pointer-y', String(y))
      frame = 0
    }
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(paint) }
    const reset = () => { x = 0; y = 0; queue() }
    const move = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return
      const bounds = element.getBoundingClientRect()
      x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
      y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
      queue()
    }
    element.addEventListener('pointermove', move, { passive: true })
    element.addEventListener('pointerleave', reset)
    reducedMotion.addEventListener('change', reset)
    finePointer.addEventListener('change', reset)
    window.addEventListener('blur', reset)
    return () => {
      window.cancelAnimationFrame(frame)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', reset)
      reducedMotion.removeEventListener('change', reset)
      finePointer.removeEventListener('change', reset)
      window.removeEventListener('blur', reset)
    }
  }, [])

  return (
    <section ref={scene} className={styles.story} aria-labelledby="lilly-headline">
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.earth} aria-hidden="true"><Image src="/login-space/earth.png" alt="" fill sizes="(max-width: 850px) 100vw, 70vw" priority /></div>
      <div className={styles.sceneGlow} aria-hidden="true" />
      <div className={styles.storyIntro}>
        <div className={styles.brand}>LILLY<span>.</span></div>{/* i18n-ignore: product name */}
        <p className={styles.claim}>{t('login.claim')}</p>
        <p className={styles.category}>{t('login.category')}</p>
        <h1 id="lilly-headline">{t('login.headlineLead')}<br /><span>{t('login.headlineAccent')}</span> {t('login.headlineEnd')}</h1>
        <p className={styles.description}>{t('login.productDescription')}</p>
        <div className={styles.benefits}>
          {features.map(({ icon: Icon, key }) => <div className={styles.benefit} key={key}><span className={styles.featureIcon}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span><span>{t(key)}</span></div>)}
        </div>
      </div>

      <div className={styles.spaceVisual} aria-hidden="true">
        <div className={styles.orbit}><i /><i /></div>
        <div className={styles.orbitInner}><i /></div>
        <div className={styles.astronaut}><Image src="/lilly-orbital-astronaut.png" alt="" width={1376} height={1152} priority sizes="(max-width: 850px) 310px, 37vw" draggable={false} /></div>
        <div className={`${styles.kpi} ${styles.tasksKpi}`}><BarChart3 size={24} /><div><span>{t('login.previewDone')}</span><strong>+32% <svg viewBox="0 0 80 25"><path d="m1 23 12-8 12 3 13-12 11 4 12-6 10 2 8-5" /></svg></strong></div></div>
        <div className={`${styles.kpi} ${styles.teamKpi}`}><Users size={23} /><div><span>{t('login.benefitTeam')}</span><strong>+24% <span className={styles.miniBars}><i /><i /><i /><i /><i /></span></strong></div></div>
        <div className={styles.missionCard}><Orbit size={24} /><span>{t('login.missionLabel')}<strong>{t('login.missionText')}</strong></span><ArrowMark /></div>

        <LaunchpadTablet />
      </div>
      <div className={styles.storyFooter}>
        <div><small>{t('login.integralSystem')}</small><strong>Eminat Group</strong></div>
        <div><small>{t('login.developedBy')}</small><strong>Stratix Communications</strong></div>
      </div>
    </section>
  )
}

function ArrowMark() {
  return <svg className={styles.arrowMark} width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 12h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
