import { Search, X } from 'lucide-react'
import { usePreferences } from '@/features/meet/lib/preferences'
import styles from './MeetingOverview.module.css'

export default function MeetingSearch({ value, onChange, history = false }: {
  value: string; onChange: (value: string) => void; history?: boolean
}) {
  const { t } = usePreferences()
  return <div className={styles.search}>
    <Search size={18} aria-hidden="true" />
    <input type="search" aria-label={t(history ? 'searchHistory' : 'searchTasks')}
      placeholder={t(history ? 'searchHistory' : 'searchTasks')} value={value}
      onChange={(event) => onChange(event.target.value)} />
    {value && <button type="button" aria-label={t('clearSearch')} onClick={() => onChange('')}><X size={18} aria-hidden="true" /></button>}
  </div>
}
