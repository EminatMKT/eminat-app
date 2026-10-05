const LIST_SEPARATOR = ', '

/** What role validation answers when a role name or its module list is not acceptable. */
const ROLE_ERRORS = {
  nameRequired: 'The role name is required.',
  nameTaken: 'A role with that name already exists.',
  nameReserved: 'That name is reserved by the system.',
  invalidModules: (slugs: string[]) => `Invalid modules: ${slugs.join(LIST_SEPARATOR)}`,
} as const

export default ROLE_ERRORS

// ROLE_ERRORS keeps the role form's messages apart from the validation logic, so the admin UI and
// the role API routes answer a bad role with the same words.
