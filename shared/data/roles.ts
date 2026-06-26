import { supabase } from '@/shared/db/supabase'
import { TABLES } from './tables'

export const listRoles = () =>
  supabase.from(TABLES.roles).select('*').order('label', { ascending: true })

export const listRoleModules = () =>
  supabase.from(TABLES.roleModules).select('*')
