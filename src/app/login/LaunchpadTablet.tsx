'use client'

import { ArrowRight, Bell, Sun } from 'lucide-react'
import { useT } from '@/shared/i18n'
import styles from './tablet.module.css'

// Presentation of the real Home/Launchpad and shell, without application data or actions.
// Layout/labels mirror src/app/(app)/page.tsx and shell/appShellConfig/nav.ts.
const areas = [
  { icon: '✅', key: 'Tasks' },
  { icon: '🚀', key: 'Marketing' },
  { icon: '💳', key: 'Billing' },
  { icon: '🔬', key: 'Research' },
  { icon: '🏥', key: 'Medical' },
  { icon: '🧾', key: 'Accounting' },
  { icon: '👤', key: 'Hr' },
  { icon: '🏢', key: 'Directory' },
] as const

const rail = [
  { icon: '🏠', label: 'Home' }, { icon: '✅', label: 'Tasks' },
  { icon: '🚀', label: 'Stratix 360' }, { icon: '🧾', label: 'Accounting' },
  { icon: '💳', label: 'Billing' }, { icon: '🏥', label: 'Medical' },
  { icon: '👤', label: 'TH/HR' }, { icon: '🔬', label: 'Research' },
  { icon: '🏢', label: 'Directory' }, { icon: '🗓️', label: 'Meetings' },
  { icon: '📈', label: 'Sales' }, { icon: '🔐', label: 'Admin' },
] as const

export default function LaunchpadTablet() {
  const { t } = useT()
  return (
    <div className={styles.tablet} data-testid="login-tablet">
      <i className={styles.camera} />
      <div className={styles.screen}>
        <div className={styles.shell}>
          <aside className={styles.rail}>
            {rail.map((item, index) => <div key={item.label} className={`${styles.railItem} ${index === 0 ? styles.active : ''}`}><span>{item.icon}</span><small>{item.label}</small></div>)}
            <div className={styles.profile}><span>F</span><small>Fred</small></div>{/* i18n-ignore: sample name */}
          </aside>
          <div className={styles.workspace}>
            <header className={styles.header}>
              <div><b>LILLY</b><small>Powered by Stratix Communications.</small><span>{t('login.tabletWelcome')}</span></div>{/* i18n-ignore: product signature */}
              <div className={styles.headerActions}><Bell /><span className={styles.online}>●</span><Sun /></div>
            </header>
            <div className={styles.content}>
              <div className={styles.badge}><i />{t('launchpad.badge')}</div>
              <h2>{t('launchpad.greeting', { name: 'Fred' })}</h2>
              <p className={styles.subtitle}>{t('launchpad.subtitle')}</p>
              <div className={styles.seeAll}>
                <span className={styles.overviewIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3" /><path d="M3 7h4M3 12h3M3 17h4M21 7h-4M21 12h-3M21 17h-4M12 3v4M12 21v-4" /></svg></span>
                <div><strong>{t('launchpad.seeAll')}</strong><p>{t('launchpad.seeAllDesc')}</p></div>
                <span className={styles.open}>{t('common.open')}<ArrowRight /></span>
              </div>
              <div className={styles.cards}>
                {areas.map(area => <div className={styles.card} key={area.key}>
                  <span className={styles.moduleIcon}>{area.icon}</span>
                  <h3>{t(`login.tablet${area.key}`)}</h3>
                  <p>{t(`login.tablet${area.key}Description`)}</p>
                  <div className={styles.leader}><small>{t('launchpad.leader')}</small>{area.key === 'Marketing' ? <span><i>F</i><b>Fred</b></span> : <em>{t('launchpad.unassigned')}</em>}</div>
                  <span className={styles.cardOpen}>{t('common.open')}<ArrowRight /></span>
                </div>)}
              </div>
              <div className={styles.footer}>{t('common.tagline')}</div>
            </div>
          </div>
        </div>
        <div className={styles.homeIndicator} />
      </div>
    </div>
  )
}
