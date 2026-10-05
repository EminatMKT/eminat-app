export { default as validateNewRole } from './validateNewRole'
export { default as validateModuleSlugs } from './validateModuleSlugs'

// The checks the role routes run before `save_role`: a new role's label (and the key derived from
// it) and the module list a role is given. Pure and browser-safe; the other helpers of this folder
// are imported where they live.
