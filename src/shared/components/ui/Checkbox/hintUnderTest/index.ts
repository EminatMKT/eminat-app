/** The hint text a test hands a disabled `Checkbox`, to find it again in the rendered markup. */
const HINT_UNDER_TEST = 'hint-under-test'

export default HINT_UNDER_TEST

// Shared by the `Checkbox` suite and by every suite of a component that composes `Checkbox` and
// passes a hint through, so all of them look for the same text Checkbox draws.
