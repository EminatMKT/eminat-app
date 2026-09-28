export { default } from './components/BillingV2Module'

// Public API of billing v2: the `/billing` thin route mounts this and nothing else. The module
// gates itself on the stored `cobranzas` permission, so existing finance grants keep working.
