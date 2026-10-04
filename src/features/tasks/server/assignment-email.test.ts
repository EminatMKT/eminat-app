import { expect, it } from 'vitest'
import { buildAssignmentEmail } from './assignment-email'

it('includes task details, official branding and matching plain text', () => {
  const message = buildAssignmentEmail({
    name: 'Ana <script>', title: 'Launch <img src=x>', area: 'Marketing & Sales',
    dueDate: '2026-10-10', url: 'https://preview.example/tasks',
  })
  expect(message.html).toContain('Nueva tarea asignada')
  expect(message.html).toContain('Ana &lt;script&gt;')
  expect(message.html).toContain('Launch &lt;img src=x&gt;')
  expect(message.html).toContain('Marketing &amp; Sales')
  expect(message.html).toContain('2026-10-10')
  expect(message.html).toContain('Stratix<span style="color:#7C3AED"> Solutions</span>')
  expect(message.html).toContain('Notificación automática de LILLY, la plataforma de tareas de Stratix Solutions.')
  expect(message.html).not.toContain('<script>')
  expect(message.text).toContain('Tarea: Launch <img src=x>')
  expect(message.text).toContain('Empresa / área: Marketing & Sales')
  expect(message.text).toContain('Fecha de entrega: 2026-10-10')
  expect(message.text).toContain('Ver tarea en LILLY: https://preview.example/tasks')
  expect(message.text).toContain('Notificación automática de LILLY, la plataforma de tareas de Stratix Solutions.')
})

it('omits unavailable optional task details in both formats', () => {
  const message = buildAssignmentEmail({ name: 'Ana', title: 'Preparar propuesta', url: 'https://app.stratixsolutions.us/tasks' })
  expect(message.html).not.toContain('Empresa / área')
  expect(message.html).not.toContain('Fecha de entrega')
  expect(message.text).not.toContain('Empresa / área')
  expect(message.text).not.toContain('Fecha de entrega')
})
