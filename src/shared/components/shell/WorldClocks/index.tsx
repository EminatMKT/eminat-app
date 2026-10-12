'use client'
import { useT } from '@/shared/i18n'
import { WORLD_ZONES, worldTime } from './clock'
import useWorldTime from './useWorldTime'
import styles from './index.module.css'

export default function WorldClocks() {
  const { t } = useT()
  const { now, source } = useWorldTime()
  return <div className={styles.row} role="group" aria-label={t('shell.worldClocks')} tabIndex={0} data-time-source={source}>
    {WORLD_ZONES.map(({ label, timeZone }) => <span className={styles.clock} key={timeZone}>
      <span className={styles.city}>{label}</span>
      <time dateTime={now?.toISOString()} data-timezone={timeZone}>{now ? worldTime(now, timeZone) : '—'}</time>
    </span>)}
  </div>
}
