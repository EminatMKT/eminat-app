import type { ChangeEvent } from 'react'
import type { ReunionForm } from '@/features/reuniones/types'

// Las dos mitades del formulario reciben lo mismo: el objeto de estado y el setter genérico.
// El tipo vive acá y no duplicado en cada una — es el contrato entre `useReunion` y los campos.
export type CamposProps = {
  form: ReunionForm
  set: (k: keyof ReunionForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}
