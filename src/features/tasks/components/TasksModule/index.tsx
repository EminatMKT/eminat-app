'use client'
import { TasksProvider } from '../TasksContext'
import TasksContent from '../TasksContent'

// Sin props: los defaults del provider ya son los de este módulo. Quien los pasa es Stratix,
// que lo monta prestado.
export default function TasksModule() {
  return (
    <TasksProvider>
      <TasksContent />
    </TasksProvider>
  )
}
