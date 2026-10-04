'use client'

import { useState } from 'react'
import * as auth from '@/shared/db/auth'
import { usuariosRepo } from '@/shared/data'
import { useRouter } from 'next/navigation'
import { ArrowRight, BarChart3, CheckCircle2, Circle, Eye, EyeOff, FolderKanban, ListTodo, LockKeyhole, Mail, Users } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { ROUTES } from '@/shared/auth/permissions'
import { DOMINIOS_VALIDOS } from '@/shared/constants/domain'
import { MARKETING_COORDINATOR_EMAIL } from '@/shared/constants/contacts'
import styles from './login.module.css'

async function obtenerUbicacion(): Promise<string> {
  try {
    const res = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    if (data.city && data.country_name) return `${data.city}, ${data.country_name}`
    return 'Ubicación desconocida'
  } catch {
    return 'Ubicación desconocida'
  }
}

const benefits = [
  { icon: ListTodo, key: 'login.benefitTasks' },
  { icon: Users, key: 'login.benefitTeam' },
  { icon: BarChart3, key: 'login.benefitProgress' },
  { icon: FolderKanban, key: 'login.benefitProjects' },
] as const

function TasksPreview() {
  const { t } = useT()
  return (
    <div className={styles.previewWrap} aria-label={t('login.previewAlt')}>
      <div className={styles.previewNote}>{t('login.ideas')} <span aria-hidden="true">↝</span></div>
      <div className={styles.previewScreen}>
        <div className={styles.previewTop}><span className={styles.previewDots}>● ● ●</span><span>{t('login.tasksProduct')}</span><span>⋯</span></div>
        <div className={styles.previewBody}>
          <aside className={styles.previewSidebar}>
            <strong>{t('login.brand')}</strong>
            <span className={styles.activeNav}>▦ &nbsp; {t('login.previewMyTasks')}</span>
            <span>◷ &nbsp; {t('login.previewPending')}</span>
            <span>◉ &nbsp; {t('login.previewProgress')}</span>
            <span>✓ &nbsp; {t('login.previewDone')}</span>
            <small>{t('login.previewProjects')}</small>
            <span>◇ &nbsp; {t('login.previewCreative')}</span>
          </aside>
          <div className={styles.previewContent}>
            <div className={styles.previewHeading}><div><small>{t('login.previewWorkspace')}</small><strong>{t('login.previewMyTasks')}</strong></div><span>+ {t('login.previewNewTask')}</span></div>
            <div className={styles.previewStats}>
              <div><small>{t('login.previewPending')}</small><b>08</b><i className={styles.purpleBar} /></div>
              <div><small>{t('login.previewProgress')}</small><b>04</b><i className={styles.blueBar} /></div>
              <div><small>{t('login.previewDone')}</small><b>12</b><i className={styles.greenBar} /></div>
            </div>
            <div className={styles.previewListTitle}>{t('login.previewToday')} <span>{t('login.previewSeeAll')} →</span></div>
            <div className={styles.previewTask}><Circle size={13} /><span>{t('login.previewTaskOne')}</span><em>{t('login.previewProgress')}</em></div>
            <div className={styles.previewTask}><Circle size={13} /><span>{t('login.previewTaskTwo')}</span><em>{t('login.previewPendingOne')}</em></div>
            <div className={styles.previewTask}><CheckCircle2 size={13} /><span>{t('login.previewTaskThree')}</span><em>{t('login.previewDoneOne')}</em></div>
          </div>
        </div>
      </div>
      <div className={styles.previewBase} />
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const { t } = useT()

  function emailValido(e: string) {
    return DOMINIOS_VALIDOS.some(d => e.toLowerCase().endsWith(d))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!emailValido(email)) {
      setError(t('login.errDomain', { domains: DOMINIOS_VALIDOS.join(', ') }))
      setLoading(false)
      return
    }

    const { error: err } = await auth.signIn(email, password)

    if (err) {
      setError(t('login.errCreds'))
      setLoading(false)
      return
    }

    const { data: { user } } = await auth.getUser()
    if (user) {
      const { data: usuario } = await usuariosRepo.findByEmail(user.email)

      if (usuario) {
        obtenerUbicacion().then(ubicacion => {
          usuariosRepo.updateUbicacion(usuario.id, ubicacion)
        })

        if (usuario.marca_hora) {
          await auth.registrarEntrada(usuario.id)
        }
      }
    }

    router.push(ROUTES.home)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!emailValido(email)) {
      setError(t('login.errDomainReset'))
      setLoading(false)
      return
    }
    const { error: err } = await auth.resetPasswordForEmail(email, `${window.location.origin}${ROUTES.resetPassword}`)
    if (err) { setError(t('login.errSendReset')); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-labelledby="lilly-headline">
        <div className={styles.storyIntro}>
          <div className={styles.brand}>LILLY<span>.</span></div>{/* i18n-ignore: product name */}
          <p className={styles.claim}>{t('login.claim')}</p>
          <h1 id="lilly-headline">{t('login.headlineLead')}<br /><span>{t('login.headlineAccent')}</span> {t('login.headlineEnd')}</h1>
          <p className={styles.description}>{t('login.productDescription')}</p>
          <div className={styles.benefits}>
            {benefits.map(({ icon: Icon, key }) => <div className={styles.benefit} key={key}><Icon size={19} strokeWidth={1.8} /><span>{t(key)}</span></div>)}
          </div>
        </div>
        <TasksPreview />
        <div className={styles.storyFooter}>
          <div><small>{t('login.integralSystem')}</small><strong>Eminat Group</strong></div>
          <div><small>{t('login.developedBy')}</small><strong>Stratix Communications</strong></div>
        </div>
      </section>

      <section className={styles.access} aria-labelledby="access-heading">
        <div className={styles.accessInner}>
          <header className={styles.accessBrand}>
            <p>{t('login.welcomeTo')}</p>
            <div className={styles.brand}>LILLY<span>.</span></div>{/* i18n-ignore: product name */}
            <small>{t('login.claim')}</small>
          </header>

          <div className={styles.formArea}>
            {sent ? (
              <div className={styles.sentMessage} role="status">
                <div className={styles.sentIcon}><Mail size={25} /></div>
                <h2 id="access-heading">{t('login.sentTitle')}</h2>
                <p>{t('login.sentBody')}</p>
                <button className={styles.textButton} type="button" onClick={() => { setSent(false); setMode('login') }}>← {t('login.backToSignIn')}</button>
              </div>
            ) : (
              <>
                <div className={styles.formHeader}>
                  <h2 id="access-heading">{mode === 'login' ? t('login.signIn') : t('login.resetTitle')}</h2>
                  <p>{mode === 'login' ? t('login.signInSub') : t('login.resetSub')}</p>
                </div>
                <form onSubmit={mode === 'login' ? handleLogin : handleReset}>
                  <div className={styles.field}>
                    <label htmlFor="login-email">{t('login.emailLabel')}</label>
                    <div className={styles.inputWrap}><Mail size={18} aria-hidden="true" /><input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('login.emailPlaceholder')} autoComplete="username" required /></div>
                  </div>
                  {mode === 'login' && (
                    <div className={styles.field}>
                      <label htmlFor="login-password">{t('login.passwordLabel')}</label>
                      <div className={styles.inputWrap}><LockKeyhole size={18} aria-hidden="true" /><input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required minLength={8} /><button className={styles.reveal} type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
                    </div>
                  )}
                  {mode === 'login' && <div className={styles.forgotRow}><button className={styles.textButton} type="button" onClick={() => { setMode('reset'); setError('') }}>{t('login.forgot')}</button></div>}
                  {error && <div className={styles.error} role="alert">{error}</div>}
                  <button className={styles.submit} type="submit" disabled={loading}>{loading ? t('common.processing') : mode === 'login' ? t('login.signIn') : t('login.sendResetLink')}{!loading && <ArrowRight size={19} aria-hidden="true" />}</button>
                </form>
                {mode === 'reset' ? <button className={styles.backButton} type="button" onClick={() => { setMode('login'); setError('') }}>← {t('login.backToSignIn')}</button> : <p className={styles.requestAccess}>{t('login.needAccess')} <a href={`mailto:${MARKETING_COORDINATOR_EMAIL}`}>{t('login.requestAccess')}</a></p>}
              </>
            )}
          </div>

          <div className={styles.mobileBenefits}>
            {benefits.map(({ icon: Icon, key }) => <div key={key}><Icon size={18} strokeWidth={1.8} /><span>{t(key)}</span></div>)}
          </div>
          <footer className={styles.accessFooter}>
            <div className={styles.footerRule} />
            <p>{t('login.ecosystemCredit')}<br />{t('login.developerCredit')}</p>
          </footer>
        </div>
      </section>
    </main>
  )
}
