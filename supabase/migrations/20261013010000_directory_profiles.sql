-- Public avatar choice and private birth date for real Directory users.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_key text;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS directorio_visible boolean NOT NULL DEFAULT false;
-- Existing named staff are visible by default. Known shared/test accounts remain
-- hidden; future accounts require an explicit admin choice before appearing.
UPDATE public.usuarios SET directorio_visible = true
WHERE lower(email) NOT IN (
  'e2e-meet-tasks@stratixsolutions.us', 'prueba@emc.health',
  'video@stratix360.com', 'design@stratix360.com', 'marketing@eminat.net'
);
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_avatar_key_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_avatar_key_check
  CHECK (avatar_key IS NULL OR avatar_key IN ('dog', 'cat', 'capybara', 'bird', 'lizard', 'bear', 'seal'));

-- Existing own-row UPDATE policy remains in force. Column grants prevent a
-- signed-in user from changing name, email, role, company, active state, etc.
REVOKE UPDATE ON public.usuarios FROM anon, authenticated;
GRANT UPDATE (avatar_key, online_at, ubicacion) ON public.usuarios TO authenticated;
-- Defensive cleanup in case an older installation retained the legacy
-- all-operations policy. Admin writes use service_role routes.
DROP POLICY IF EXISTS "superadmin_all_users" ON public.usuarios;

CREATE TABLE IF NOT EXISTS public.usuario_perfil_privado (
  usuario_id uuid PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha_nacimiento date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuario_perfil_privado_birth_date_check
    CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento <= CURRENT_DATE)
);
ALTER TABLE public.usuario_perfil_privado ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuario_perfil_privado FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.usuario_perfil_privado TO authenticated;
GRANT ALL ON public.usuario_perfil_privado TO service_role;

CREATE POLICY usuario_perfil_privado_read_self ON public.usuario_perfil_privado
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = usuario_id AND u.auth_id = auth.uid() AND u.activo = true
  ));
