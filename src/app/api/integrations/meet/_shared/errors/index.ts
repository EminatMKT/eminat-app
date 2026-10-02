import type { MeetError } from './types'

/** Every error the Meet API answers with, named once; a call site passes the name, never the text. */
const MEET_ERRORS = {
  unauthenticated: { status: 401, code: 'UNAUTHORIZED', message: 'Not authenticated.' },
  invalidSession: { status: 401, code: 'UNAUTHORIZED', message: 'Invalid session.' },
  missingTasksModule: { status: 403, code: 'UNAUTHORIZED', message: 'The tasks module is required.' },
  noActiveProfile: { status: 403, code: 'UNAUTHORIZED', message: 'The authenticated user has no active profile.' },
  invalidId: { status: 400, code: 'INVALID_ID', message: 'Invalid activityId.' },
  invalidPayload: { status: 400, code: 'INVALID_PAYLOAD', message: 'Invalid payload.' },
  taskError: { status: 500, code: 'TASK_ERROR', message: 'Task error.' },
  taskReadForbidden: { status: 403, code: 'TASK_FORBIDDEN', message: 'You cannot read this Task from Meet.' },
  taskReadDenied: { status: 403, code: 'TASK_READ_FORBIDDEN', message: 'The Task could not be read.' },
  taskNotFound: { status: 404, code: 'TASK_NOT_FOUND', message: 'Task not found.' },
  taskListForbidden: { status: 403, code: 'TASK_LIST_FORBIDDEN', message: 'Could not determine the Tasks scope.' },
  invalidAssigneeInactive: { status: 422, code: 'INVALID_ASSIGNEE', message: 'The responsible is inactive or does not exist.' },
  invalidAssigneeModule: { status: 422, code: 'INVALID_ASSIGNEE', message: 'The responsible lacks the tasks module.' },
  invalidCompany: { status: 422, code: 'INVALID_COMPANY', message: 'The company is not enabled for Activities.' },
  topicForbidden: { status: 403, code: 'TOPIC_FORBIDDEN', message: 'You cannot manage this Topic.' },
  taskCreateFailed: { status: 409, code: 'TASK_CREATE_FAILED', message: 'Could not create the Task.' },
  taskManageForbidden: { status: 403, code: 'TASK_FORBIDDEN', message: 'You cannot manage this Task from Meet.' },
  taskUpdateForbidden: { status: 403, code: 'TASK_UPDATE_FORBIDDEN', message: 'The Task could not be updated.' },
  taskConflict: { status: 409, code: 'TASK_CONFLICT', message: 'The Task was modified from another session.' },
  catalogsForbidden: { status: 403, code: 'CATALOGS_FORBIDDEN', message: 'The catalogs could not be read.' },
  assigneesForbidden: { status: 403, code: 'ASSIGNEES_FORBIDDEN', message: 'The assignees could not be read.' },
} satisfies Record<string, MeetError>

export default MEET_ERRORS

// MEET_ERRORS is the Meet API's error catalogue: status, code and message travel together, so
// a code can't be paired with the wrong status, and the codes Meet branches on live in one place.
