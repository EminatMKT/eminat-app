/** Verified ANNIE Lead transition graph, owned by LILLY after cutover. */
export const leadTransitions = {
  NEW: ['ASSIGNED', 'ATTEMPTING_CONTACT', 'CONTACTED', 'FOLLOW_UP', 'UNRESPONSIVE', 'NOT_INTERESTED', 'LOST'],
  ASSIGNED: ['ATTEMPTING_CONTACT', 'CONTACTED', 'FOLLOW_UP', 'UNRESPONSIVE', 'NOT_INTERESTED', 'LOST'],
  ATTEMPTING_CONTACT: ['CONTACTED', 'FOLLOW_UP', 'UNRESPONSIVE', 'NOT_INTERESTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'FOLLOW_UP', 'UNRESPONSIVE', 'NOT_INTERESTED', 'LOST'],
  FOLLOW_UP: ['ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED', 'UNRESPONSIVE', 'NOT_INTERESTED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'FOLLOW_UP', 'NOT_INTERESTED', 'LOST'],
  PROPOSAL: ['PAYMENT_PENDING', 'LOST'],
  PAYMENT_PENDING: ['WON', 'LOST'],
  WON: [],
  LOST: ['NEW'],
  UNRESPONSIVE: ['ATTEMPTING_CONTACT', 'CONTACTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'LOST'],
  NOT_INTERESTED: ['NEW'],
  CONVERTED: [],
} as const

export type LeadStatus = keyof typeof leadTransitions

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && Object.hasOwn(leadTransitions, value)
}

export function canTransitionLead(from: unknown, to: unknown): boolean {
  if (!isLeadStatus(from) || !isLeadStatus(to)) return false
  return (leadTransitions[from] as readonly string[]).includes(to)
}
