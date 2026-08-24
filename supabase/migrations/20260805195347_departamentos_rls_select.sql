-- departamentos: lectura para authenticated. Necesario para el embed del Team tab
-- (equipos -> departamentos). La tabla tenía RLS habilitada sin ninguna policy (default-deny).
DROP POLICY IF EXISTS "departamentos_select_authenticated" ON public.departamentos;
CREATE POLICY "departamentos_select_authenticated" ON public.departamentos
  FOR SELECT TO authenticated USING (true);
