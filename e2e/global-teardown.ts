import { ensureUser, setRol, deleteUser, deleteRole } from './seed'

// Deja la DB local en un baseline limpio tras la suite, para que el panel manual
// (que comparte esta DB) no se llene de fixtures. Estado final: solo freddy (admin)
// y nuevo@ (sin_asignar). Se borran los usuarios y el rol que crean los tests.
//
// Orden: nuevo@ vuelve a sin_asignar ANTES de borrar 'soporte' (FK RESTRICT en
// usuarios.rol impide borrar un rol que algún usuario tenga).
export default async function globalTeardown() {
  await ensureUser('freddy@eminat.net', 'admin', 'Freddy', 'Admin')
  await setRol('nuevo@eminat.net', 'sin_asignar')
  await deleteRole('soporte')
  await deleteUser('creado@eminat.net') // lo crea A6
  await deleteUser('admin2@eminat.net') // lo crea C9
  await deleteUser('bootstrap@eminat.net') // C11 lo borra; por si la suite cortó antes
}
