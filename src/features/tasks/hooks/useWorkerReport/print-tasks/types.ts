import printWorkerReport from '@/features/tasks/components/reporte/WorkerReport/print'

export type ReportRows = Parameters<typeof printWorkerReport>[0]
export type ReportContext = Parameters<typeof printWorkerReport>[2]
