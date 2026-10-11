export type ActivityCreationResult = { id?: string; error?: string }

/**
 * Idempotencia limitada a la sesión del componente.
 * No reemplaza una constraint/RPC transaccional en base de datos (NOT VERIFIED).
 */
export class LocalActivityIdempotency {
  private readonly pending = new Map<
    string,
    Promise<ActivityCreationResult>
  >()
  private readonly createdIds = new Map<string, string>()

  getCreatedId(topicId: string): string | undefined {
    return this.createdIds.get(topicId)
  }

  rememberCreatedId(topicId: string, activityId: string): void {
    this.createdIds.set(topicId, activityId)
  }

  run(
    topicId: string,
    operation: () => Promise<ActivityCreationResult>
  ): Promise<ActivityCreationResult> {
    const existing = this.pending.get(topicId)
    if (existing) return existing

    const request = operation().finally(() => this.pending.delete(topicId))
    this.pending.set(topicId, request)
    return request
  }
}
