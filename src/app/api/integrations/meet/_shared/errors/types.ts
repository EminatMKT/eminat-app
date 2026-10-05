/** An error the Meet API answers with: HTTP status, the code Meet branches on, and an English message. */
export type MeetError = { status: number; code: string; message: string }
