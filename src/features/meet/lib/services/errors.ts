export type ServiceErrorKind =
  | 'session'
  | 'expired_session'
  | 'unauthorized'
  | 'rls'
  | 'not_found'
  | 'network'
  | 'conflict'
  | 'validation'
  | 'partial'
  | 'indeterminate'
  | 'unknown'

export interface ServiceError {
  kind: ServiceErrorKind
  message: string
  code?: string
  cause?: unknown
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError }

type ErrorLike = {
  code?: string
  message?: string
  status?: number
  name?: string
}

export function serviceError(
  kind: ServiceErrorKind,
  message: string,
  cause?: unknown,
  code?: string
): ServiceError {
  return { kind, message, cause, code }
}

export function classifyServiceError(error: unknown): ServiceError {
  const value = (error ?? {}) as ErrorLike
  const code = value.code
  const message = value.message || 'Ocurrió un error inesperado.'
  const normalized = message.toLowerCase()

  if (code === 'PGRST116') {
    return serviceError('not_found', 'El registro no existe.', error, code)
  }
  if (code === '23505' || value.status === 409) {
    return serviceError('conflict', 'El registro cambió o ya existe.', error, code)
  }
  if (code === '42501' || normalized.includes('row-level security')) {
    return serviceError('rls', 'La política de acceso rechazó la operación.', error, code)
  }
  if (
    value.status === 401 ||
    normalized.includes('jwt expired') ||
    normalized.includes('token is expired')
  ) {
    return serviceError(
      normalized.includes('expired') ? 'expired_session' : 'session',
      normalized.includes('expired')
        ? 'La sesión expiró.'
        : 'Se requiere una sesión válida.',
      error,
      code
    )
  }
  if (value.status === 403 || normalized.includes('permission denied')) {
    return serviceError('unauthorized', 'No tienes acceso a este recurso.', error, code)
  }
  if (
    value.name === 'TypeError' ||
    normalized.includes('fetch') ||
    normalized.includes('network')
  ) {
    return serviceError('network', 'No se pudo conectar con el servicio.', error, code)
  }
  return serviceError('unknown', message, error, code)
}

export function partialError(
  message: string,
  cause?: unknown
): ServiceError {
  return serviceError('partial', message, cause)
}
