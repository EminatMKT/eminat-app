export type Accepted = { ok: true }
export type RoleAccepted = { ok: true; key: string }
export type Rejected = { ok: false; error: string }
export type RoleResult = RoleAccepted | Rejected
export type SlugsResult = Accepted | Rejected
