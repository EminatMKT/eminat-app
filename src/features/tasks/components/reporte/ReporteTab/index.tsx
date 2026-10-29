'use client'
import WorkerReport from '../WorkerReport'

// Every role consumes the same server-authorized DTO; ADMIN never reads the shared task cache here.
export default function ReporteTab() { return <WorkerReport /> }
