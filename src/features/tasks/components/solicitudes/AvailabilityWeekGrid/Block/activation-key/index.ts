const ACTIVATION_KEYS = ['Enter', ' ']

/** Whether a keyboard key should activate a block the same way a click would. */
export default function isActivationKey(key: string): boolean {
  return ACTIVATION_KEYS.includes(key)
}

// isActivationKey is Block's only key-handling decision, kept pure and tested without a DOM.
