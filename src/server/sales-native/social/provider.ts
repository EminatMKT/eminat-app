import type { SalesActor } from '../policy'

export type SocialProviderCode = 'META' | (string & {})
export type SocialCapabilities = {
  oauth: boolean
  tokenRefresh: boolean
  leadAds: boolean
  messaging: boolean
  comments: boolean
  replies: boolean
  webhooks: boolean
}
export type SocialConnectionFeatures = {
  leadAds: boolean
  messaging: boolean
  comments: boolean
  instagram: boolean
}
export type SocialAsset = {
  id: string
  organizationId: string
  integrationId: string
  externalId: string
  name: string
  type: 'page' | 'instagram' | 'ad_account' | 'other'
}
export type SocialWebhookEvent = {
  provider: SocialProviderCode
  externalEventId: string
  externalAssetId: string
  kind: string
  occurredAt: string
  normalized: Record<string, unknown>
}

/** Provider I/O is isolated from CRM storage so Google can be added later. */
export interface SocialProvider {
  readonly code: SocialProviderCode
  readonly capabilities: SocialCapabilities
  beginConnection(actor: SalesActor, features: SocialConnectionFeatures): Promise<{ url: string; stateHash: string }>
  completeConnection(state: string, code: string): Promise<{ integrationId: string }>
  disconnect(actor: SalesActor, integrationId: string): Promise<void>
  refreshConnection(actor: SalesActor, integrationId: string): Promise<void>
  discoverAssets(actor: SalesActor, integrationId: string): Promise<SocialAsset[]>
  verifyChallenge(mode: unknown, token: unknown, challenge: unknown): string
  verifyWebhook(raw: Buffer, signature: unknown): void
  normalizeWebhook(raw: Buffer): SocialWebhookEvent[]
  reply?(actor: SalesActor, conversationId: string, text: string): Promise<{ externalId: string }>
}

export class SocialProviderRegistry {
  private readonly providers = new Map<string, SocialProvider>()

  register(provider: SocialProvider): void {
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(provider.code) || this.providers.has(provider.code))
      throw new Error('SOCIAL_PROVIDER_REGISTRATION_INVALID')
    this.providers.set(provider.code, provider)
  }

  require(code: string): SocialProvider {
    const provider = this.providers.get(code)
    if (!provider) throw new Error('SOCIAL_PROVIDER_UNAVAILABLE')
    return provider
  }

  list(): { code: string; capabilities: SocialCapabilities }[] {
    return Array.from(this.providers.values(), provider => ({ code: provider.code, capabilities: provider.capabilities }))
  }
}
