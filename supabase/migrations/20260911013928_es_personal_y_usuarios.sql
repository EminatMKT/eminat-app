-- `usuarios` deja de abrirse por el solo hecho de tener una sesión.
--
-- QUÉ PASÓ. El 10/09/2026 `usuarios` tenía `Lectura autenticada de usuarios` con `qual: true`
-- para `authenticated`: cualquier sesión leía las 17 filas y sus 25 columnas. Eso fue correcto
-- mientras el único emisor de sesiones fuera nuestro login. Ese día se encontró una segunda
-- aplicación desplegada contra el MISMO proyecto de Supabase (`meet.stratixsolutions.us`), cuyo
-- `signInWithOtp` corre sin `shouldCreateUser: false` y sin validar el dominio del correo: desde
-- ahí, cualquier dirección del mundo obtenía una sesión `authenticated` en producción.
--
-- El log de `auth.users` se revisó: sólo se habían registrado dos cuentas de prueba propias. Fue
-- exposición sin explotación. La conclusión igual no cambia: una policy que depende de quién
-- puede sacar una sesión delega la seguridad en una decisión que se toma fuera de este repo.
--
-- `es_personal()` es `is_admin()` sin el filtro de rol. SECURITY DEFINER por el mismo motivo que
-- aquella: sin eso, una policy sobre `usuarios` que consulta `usuarios` entra en recursión.
--
-- EL REVOKE NO ES DE ESTE INCIDENTE, y es lo más grave de la migración. En producción `anon` no
-- tiene SELECT sobre `usuarios`, pero eso vive en la configuración de Data API del dashboard y no
-- en ninguna migración: en LOCAL, con el esquema construido desde este repo,
-- `has_table_privilege('anon','public.usuarios','SELECT')` da `true`. O sea que una base creada
-- desde cero expone el directorio de personal a `anon`, con la publishable key que viaja en el
-- bundle. Lo predijo la migración `20260831214348_revocar_anon_vistas.sql` cuando dejó escrito
-- que los DEFAULT PRIVILEGES de `public` otorgan `arwdDxtm` a `anon` sobre toda relación, y que
-- cerrarlo iba "como ítem aparte". Esto paga la parte de `usuarios`; la causa raíz sigue viva.
--
-- REVOKE ALL y no REVOKE SELECT, con el mismo criterio del 29/08 y del 31/08: los otros
-- privilegios hoy son inertes, pero inerte es una propiedad del esquema de hoy, no una garantía.

create or replace function public.es_personal() returns boolean
  language sql stable security definer
  as $$
  select exists (select 1 from public.usuarios u where u.auth_id = auth.uid());
$$;

alter function public.es_personal() owner to postgres;

comment on function public.es_personal() is
  'true si auth.uid() tiene fila en usuarios. Predicado mínimo de pertenencia: reemplaza al '
  'qual `true` sobre `authenticated`, que asumía que toda sesión era de alguien del holding.';

-- Nada cambia para quien ya usaba la app: con fila en `usuarios`, se ve lo mismo que antes.
drop policy if exists "Lectura autenticada de usuarios" on public.usuarios;
create policy "Lectura autenticada de usuarios" on public.usuarios
  for select to authenticated using (public.es_personal());

-- `Lectura pública de usuarios` era `{anon} qual: true`. En producción está tapada por la falta
-- de GRANT; en local no. Se borra la policy Y se revoca el GRANT: una policy abierta que sólo
-- está tapada por un privilegio es un arma cargada esperando que alguien lo devuelva.
drop policy if exists "Lectura pública de usuarios" on public.usuarios;

revoke all on public.usuarios from anon;

-- El guard: si a `anon` le quedó CUALQUIER privilegio sobre `usuarios`, la migración aborta.
-- Una fuga que se cierra "casi" no se cerró.
DO $$
DECLARE quedan text;
BEGIN
  SELECT string_agg(distinct privilege_type, ', ')
    INTO quedan
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'usuarios' AND grantee = 'anon';
  IF quedan IS NOT NULL THEN
    RAISE EXCEPTION 'anon todavía tiene privilegios sobre usuarios: %', quedan;
  END IF;
END $$;

-- La otra mitad del guard: el personal TIENE que seguir leyendo. Si el REVOKE o la policy se
-- pasaron de rosca, esto lo dice acá y no en producción.
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.usuarios', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated perdió el SELECT sobre usuarios: el directorio queda muerto';
  END IF;
END $$;
