import { ensureUser } from './seed'

// El test C12 degrada a freddy@ a sin_asignar (guard de último admin). global-setup
// lo re-asigna admin al INICIO de la próxima corrida, pero entre corridas el login
// manual lo vería sin módulos. Restaurar acá deja la DB local usable tras la suite.
export default async function globalTeardown() {
  await ensureUser('freddy@eminat.net', 'admin', 'Freddy', 'Admin')
}
