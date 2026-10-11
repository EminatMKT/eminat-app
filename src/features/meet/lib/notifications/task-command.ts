export function canManageMeeting(authUserId: string, meetingOwnerId: string): boolean {
  return Boolean(authUserId && meetingOwnerId && authUserId === meetingOwnerId)
}

export function meetingAuthorizationStatus(
  authUserId: string,
  meetingOwnerId: string
): 200 | 403 {
  return canManageMeeting(authUserId, meetingOwnerId) ? 200 : 403
}
