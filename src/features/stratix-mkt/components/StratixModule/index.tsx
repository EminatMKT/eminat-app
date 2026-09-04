'use client'
// El provider de tareas: Stratix también lo monta porque su sección Team cuenta las tareas en
// proceso de cada persona. Va con SU catálogo y SU clave de preferencia.
import { TasksProvider } from '@/features/tasks/components/TasksContext'
import { STRATIX_TAB, STRATIX_TABS, STRATIX_TAB_PREF } from '@/features/stratix-mkt/constants/tabs'
import StratixContent from '../StratixContent'

export default function StratixModule() {
  return (
    <TasksProvider prefKey={STRATIX_TAB_PREF} tabs={STRATIX_TABS} tabInicial={STRATIX_TAB.SOCIAL}>
      <StratixContent />
    </TasksProvider>
  )
}
