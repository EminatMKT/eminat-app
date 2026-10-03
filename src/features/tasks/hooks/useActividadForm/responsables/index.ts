export { default as toggleResponsable } from './toggle-responsable'
export { default as toggleLeader } from './toggle-leader'
export { default as newlyAddedResponsableIds } from './newly-added'

// The pure edits the task form makes to its list of responsables: check or uncheck a person, move
// the leader's crown, and diff two lists to know whom to notify. Leadership is exclusive and only
// a checked person can hold it, so unchecking the leader leaves the task with no leader.
