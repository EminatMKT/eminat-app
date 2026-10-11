type ReadResult<T> = { data: T[] | null; error: { message: string } | null }

export async function loadMeetingListAndTasks<Meeting, Tasks>(
  meetingRequest: PromiseLike<ReadResult<Meeting>>,
  taskRequest: PromiseLike<Tasks>
): Promise<{
  meetings: Meeting[]
  tasks: Tasks | null
  meetingError: string | null
  taskError: string | null
}> {
  const [meetingResult, taskResult] = await Promise.allSettled([
    meetingRequest,
    taskRequest,
  ])
  const meetingError = meetingResult.status === 'rejected'
    ? String(meetingResult.reason)
    : meetingResult.value.error?.message ?? null
  const taskError = taskResult.status === 'rejected'
    ? taskResult.reason instanceof Error ? taskResult.reason.message : String(taskResult.reason)
    : null

  return {
    meetings: meetingResult.status === 'fulfilled' && !meetingResult.value.error
      ? meetingResult.value.data ?? []
      : [],
    tasks: taskResult.status === 'fulfilled' ? taskResult.value : null,
    meetingError,
    taskError,
  }
}
