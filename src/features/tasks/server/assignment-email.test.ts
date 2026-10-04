import { expect, it } from 'vitest'
import { buildAssignmentEmail } from './assignment-email'

it('includes task fields and escapes untrusted text in HTML', () => {
  const message = buildAssignmentEmail({
    name: 'Ana <script>', title: 'Launch <img src=x>', area: 'Marketing & Sales',
    dueDate: '2026-10-10', url: 'https://preview.example/tasks',
  })
  expect(message.html).toContain('Nueva tarea asignada')
  expect(message.html).toContain('Ana &lt;script&gt;')
  expect(message.html).toContain('Launch &lt;img src=x&gt;')
  expect(message.html).toContain('Marketing &amp; Sales')
  expect(message.html).toContain('2026-10-10')
  expect(message.html).not.toContain('<script>')
  expect(message.text).toContain('Ver tarea en LILLY: https://preview.example/tasks')
})
