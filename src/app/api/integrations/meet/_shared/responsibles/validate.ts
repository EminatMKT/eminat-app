import type { z } from 'zod'
import normalizeResponsibles from './normalize'
import type { ResponsiblesRequest } from './types'

const issues = {
  bothShapes: { code: 'custom', message: 'Send responsable_id or responsable_ids, not both.' },
  leaderOutside: { code: 'custom', message: 'The leader must be one of the responsibles.' },
  noResponsible: { code: 'custom', message: 'A Task needs at least one responsible.' },
} as const

/** Legacy `responsable_id` and the new `responsable_ids` are exclusive; a leader needs a set that contains it. */
const update = (request: ResponsiblesRequest, ctx: z.RefinementCtx) => {
  const { responsable_id, responsable_ids, lider_id } = request
  const bothShapes = Boolean(responsable_id && responsable_ids)
  if (bothShapes) ctx.addIssue(issues.bothShapes)
  const set = normalizeResponsibles(request)
  const leaderOutside = Boolean(lider_id && !set?.ids.includes(lider_id))
  if (leaderOutside) ctx.addIssue(issues.leaderOutside)
}

/** Same as `update`, and a new Task needs at least one responsible. */
const create = (request: ResponsiblesRequest, ctx: z.RefinementCtx) => {
  update(request, ctx)
  const set = normalizeResponsibles(request)
  if (!set?.ids.length) ctx.addIssue(issues.noResponsible)
}

const validateResponsibles = { create, update }

export default validateResponsibles
// Zod refinements shared by the Meet create/update contracts for the responsible fields.
