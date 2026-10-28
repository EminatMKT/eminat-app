import { afterEach, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { recordSecurityEvent } from './security-audit'
afterEach(() => vi.restoreAllMocks())

it('records actor, organization, resource, outcome, timestamp and correlation without request values', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const id = '00000000-0000-4000-8000-000000000001'
  const requestId = recordSecurityEvent({ action: 'patient.profile.updated', actorId: id, organizationId: id,
    resourceId: id, outcome: 'SUCCESS', changedFields: ['address', 'password', 'access_token', 'address', 'private@example.invalid'] })
  expect(info).toHaveBeenCalledWith('SECURITY_AUDIT_EVENT', expect.objectContaining({
    requestId, actorId: id, organizationId: id, resourceId: id, resourceType: 'patient_contact',
    outcome: 'SUCCESS', changedFields: ['address'], timestamp: expect.any(String),
  }))
  expect(JSON.stringify(info.mock.calls)).not.toMatch(/password|access_token|private@example/)
})
it('does not emit untrusted identifiers or unknown identities for denied access', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  recordSecurityEvent({ action: 'sales.access.denied', actorId: 'private@example.invalid', resourceId: 'private-test-canary', outcome: 'DENIED' })
  expect(info).toHaveBeenCalledWith('SECURITY_AUDIT_EVENT', expect.objectContaining({ actorId: null, resourceId: null, outcome: 'DENIED' }))
  expect(JSON.stringify(info.mock.calls)).not.toContain('private-test-canary')
})
