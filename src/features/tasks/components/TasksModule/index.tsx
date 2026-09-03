'use client'
import { StratixProvider } from '@/features/stratix-mkt/components/StratixContext'
import { TASKS_TAB, TASKS_TABS, TASKS_TAB_PREF } from '@/features/tasks/constants/tabs'
import TasksContent from '../TasksContent'

export default function TasksModule() {
  return (
    <StratixProvider prefKey={TASKS_TAB_PREF} tabs={TASKS_TABS} tabInicial={TASKS_TAB.KANBAN}>
      <TasksContent />
    </StratixProvider>
  )
}
