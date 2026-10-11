export const STRATIX_MEET_FROM_EMAIL = 'Stratix Meet <notifications@stratixsolutions.us>'

export function getStratixMeetSender() {
  const configured = process.env.NOTIFY_FROM_EMAIL?.trim()
  if (configured && configured !== STRATIX_MEET_FROM_EMAIL) {
    throw new Error('NOTIFY_FROM_EMAIL no coincide con el remitente autorizado de Stratix Meet.')
  }
  return configured || STRATIX_MEET_FROM_EMAIL
}
