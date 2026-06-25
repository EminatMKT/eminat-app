import { ensureUser, deleteRole } from './seed'

// Estado base ANTES de cada corrida (idempotente):
//  - freddy@  = admin (driver principal de la UI)
//  - nuevo@   = sin_asignar (tests de gating); resetear el rol libera 'soporte'
//  - bootstrap@ = admin (se borra en el test de independencia de admins)
//  - se elimina el rol dinámico 'soporte' que dejan las corridas previas
export default async function globalSetup() {
  await ensureUser('freddy@eminat.net', 'admin', 'Freddy', 'Admin')
  await ensureUser('bootstrap@eminat.net', 'admin', 'Boot', 'Strap')
  await ensureUser('nuevo@eminat.net', 'sin_asignar', 'Nuevo', 'Usuario') // resetea rol → suelta 'soporte'
  await deleteRole('soporte')
}
