const CONTROL = {
  text: 'text', date: 'date', time: 'time',
  select: 'select', textarea: 'textarea', toggle: 'toggle',
} as const

/** The kinds of control a billing field can be edited with, named once. */
export default CONTROL

// The editor's form is data: a field spec says which of these it wants and one renderer picks
// the control. The names live here so a spec and that renderer compare identifiers instead of
// quoted strings — a typo then fails to compile rather than drawing an empty row.
