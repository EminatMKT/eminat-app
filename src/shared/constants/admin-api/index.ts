/** The admin API routes, named once for the admin UI and the e2e suites that call them. */
const ADMIN_API = {
  createUser: '/api/admin/create-user',
  updateUser: '/api/admin/update-user',
  deleteUser: '/api/admin/delete-user',
  resetPassword: '/api/admin/reset-password',
  reassignAndDelete: '/api/admin/reassign-and-delete',
  roles: '/api/admin/roles',
} as const

export default ADMIN_API

// ADMIN_API keeps each admin endpoint's path in one place, so the UI and the tests that hit it
// cannot drift apart when a route moves.
