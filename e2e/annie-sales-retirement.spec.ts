import { expect, test } from '@playwright/test'

const retiredPaths = ['access', 'directory', 'leads', 'contacts', 'accounts', 'opportunities', 'pipeline',
  'leads/00000000-0000-4000-8000-000000000000/history']

for (const method of ['GET', 'POST'] as const) {
  test(`retired ANNIE Sales bridge exposes no ${method} endpoints`, async ({ request }) => {
    for (const path of retiredPaths) {
      const response = await request.fetch(`/api/integrations/annie/sales/${path}`, {
        method, ...(method === 'POST' ? { data: {} } : {}),
      })
      expect(response.status(), `${method} ${path} must remain retired`).toBe(404)
    }
  })
}
