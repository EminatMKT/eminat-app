-- REVIEW PROPOSAL ONLY. Not applied. Use protected check/approval/apply/approval/verify.
BEGIN;
CREATE OR REPLACE FUNCTION public.registrar_entrada(p_usuario_id uuid, p_ip text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
declare
 v_id uuid;
 v_marca_hora boolean;
 v_tipo_jornada text;
begin
 if coalesce(auth.role(), '') <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = p_usuario_id AND u.auth_id = auth.uid() AND u.activo) then
 raise exception 'ATTENDANCE_ACCESS_DENIED' using errcode = '42501';
 end if;
 -- Verifica si el usuario registra horario
 select marca_hora, tipo_jornada into v_marca_hora, v_tipo_jornada
 from public.usuarios where id = p_usuario_id;

 -- Solo registra si marca_hora = true (no pasantes)
 if not v_marca_hora then
 return null;
 end if;

 -- Inserta o actualiza la marcación del día
 insert into public.marcaciones (usuario_id, fecha, hora_entrada, ip_entrada)
 values (p_usuario_id, current_date, now(), p_ip)
 on conflict (usuario_id, fecha)
 do nothing -- Si ya entró hoy, no sobrescribe
 returning id into v_id;

 return v_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.registrar_entrada(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrada(uuid,text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.registrar_salida(p_usuario_id uuid, p_ip text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
begin
 if coalesce(auth.role(), '') <> 'service_role' AND NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = p_usuario_id AND u.auth_id = auth.uid() AND u.activo) then
 raise exception 'ATTENDANCE_ACCESS_DENIED' using errcode = '42501';
 end if;
 update public.marcaciones
 set hora_salida = now(), ip_salida = p_ip
 where usuario_id = p_usuario_id
 and fecha = current_date
 and hora_salida is null;
end;
$function$;

REVOKE ALL ON FUNCTION public.registrar_salida(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_salida(uuid,text) TO authenticated, service_role;
COMMIT;
