import { supabase } from './supabase'

// Capa de acceso a auth de Supabase: centraliza supabase.auth.* + el rpc de
// login. Las funciones envuelven la llamada exacta y devuelven lo mismo que
// devolvía supabase (PostgrestResponse / AuthResponse), para no cambiar el
// comportamiento de los callers. Complementa session (loadProfile/signOutAndRedirect).

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const getUser = () => supabase.auth.getUser()

export const signOut = () => supabase.auth.signOut()

export const resetPasswordForEmail = (email: string, redirectTo: string) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo })

export const updatePassword = (password: string) =>
  supabase.auth.updateUser({ password })

// RPC de login: registra la entrada (marca hora) del usuario.
export const registrarEntrada = (usuarioId: string) =>
  supabase.rpc('registrar_entrada', { p_usuario_id: usuarioId })
