import optimisticUpdate from '../optimistic-update'

/** Corrects a task's delivery date, if nobody changed it since the screen read it. */
export default function updateDeliveryDate(id: string, deliveryDate: string, expectedUpdatedAt?: string) {
  const change = { fecha_entrega: deliveryDate }
  return optimisticUpdate(id, change, expectedUpdatedAt)
}

// It exists because a wrongly loaded date had no fix from the app: six rows with the year 0206
// hung the Gantt for months. It does NOT touch `mes` or `trimestre` — those are the pay report's
// imputation period, a separate decision from when the task is delivered. The barrel offers it as
// `updateFecha`, the name its callers use.
