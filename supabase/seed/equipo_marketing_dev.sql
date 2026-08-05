-- SEED dev/local del equipo de marketing. NO es una migración (no versionar en prod).
-- Requiere la migración estructura_equipos_cargos aplicada. Idempotente por email.
-- Prod NO usa este seed: allá el equipo se backfillea sobre usuarios ya existentes.

INSERT INTO public.usuarios (email, nombre, apellido, rol, activo, auth_id, equipo_id, cargo_id, responsable_ref, color)
SELECT v.email, v.nombre, v.apellido, 'stratix360', v.activo, NULL,
       CASE WHEN v.en_equipo THEN e.id ELSE NULL END,
       c.id, v.ref, v.color
FROM (VALUES
  -- nombre, apellido, email, cargo, responsable_ref, activo, en_equipo(MKT), color
  ('Freddy','Crespín','freddy@eminat.net','Director de Marketing','Coord_MFreddy', true,  true,  '#7C6FF7'),
  ('Joselyne','Guerrero','joselyne@eminat.net','Lead Designer','DG_Joselyn',       true,  true,  '#F472B6'),
  ('Arianna','Sig-Tú','arianna@eminat.net','Graphic Designer','DG_Ariana',          true,  true,  '#A78BFA'),
  ('Angie','Núñez','angie@eminat.net','Graphic Designer',NULL,                      true,  true,  '#60A5FA'),
  ('David','Falconi','david@eminat.net','Lead Editor & Animations','DGA_David',      true,  true,  '#34D399'),
  ('Bryan','Núñez','bryan@eminat.net','Video Editor','EV_Bryan',                     true,  true,  '#FB923C'),
  ('Tasha','Palomino','tasha@eminat.net','Video Editor',NULL,                        true,  true,  '#F87171'),
  ('Wagner','Dueñas','wagner@eminat.net','Full Stack Developer',NULL,                true,  true,  '#FBB040'),
  ('Naomi','Panchana','naomi@eminat.net','Ejecutiva de Cuentas & CM','CM_ Naomi',    true,  true,  '#60A5FA'),
  -- Inactivo: solo para resolver responsable_ref histórico en actividades viejas
  ('Jonathan','Bula','jonathan@eminat.net','',' Jonathan_CRM_PLACEHOLDER',           false, false, '#9494B3')
) AS v(nombre, apellido, email, cargo, ref, activo, en_equipo, color)
LEFT JOIN public.cargos c ON c.nombre = v.cargo
CROSS JOIN public.equipos e
WHERE e.codigo = 'MKT-GEN'
ON CONFLICT (email) DO NOTHING;

-- Corrige el ref de Jonathan (el placeholder de arriba evita chocar con la columna;
-- se setea explícito aquí para dejar claro el valor real).
UPDATE public.usuarios SET responsable_ref = 'Jonathan_CRM' WHERE email = 'jonathan@eminat.net';

-- Líder del equipo Marketing = Freddy
UPDATE public.equipos
SET lider_id = (SELECT id FROM public.usuarios WHERE responsable_ref = 'Coord_MFreddy')
WHERE codigo = 'MKT-GEN';
