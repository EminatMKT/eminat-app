-- SEED dev/local del equipo de marketing. NO es una migración (no versionar en prod).
-- Requiere la migración estructura_equipos_cargos aplicada. Idempotente por email.
-- Prod NO usa este seed: allá el equipo se backfillea sobre usuarios ya existentes.

INSERT INTO public.usuarios (email, nombre, apellido, rol, activo, auth_id, equipo_id, cargo_id, color)
SELECT v.email, v.nombre, v.apellido, 'stratix360', v.activo, NULL,
       CASE WHEN v.en_equipo THEN e.id ELSE NULL END,
       c.id, v.color
FROM (VALUES
  -- nombre, apellido, email, cargo, activo, en_equipo(MKT), color
  ('Freddy','Crespín','freddy@eminat.net','Director de Marketing',        true,  true,  '#7C6FF7'),
  ('Joselyne','Guerrero','joselyne@eminat.net','Lead Designer',           true,  true,  '#F472B6'),
  ('Arianna','Sig-Tú','arianna@eminat.net','Graphic Designer',            true,  true,  '#A78BFA'),
  ('Angie','Núñez','angie@eminat.net','Graphic Designer',                 true,  true,  '#60A5FA'),
  ('David','Falconi','david@eminat.net','Lead Editor & Animations',       true,  true,  '#34D399'),
  ('Bryan','Núñez','bryan@eminat.net','Video Editor',                     true,  true,  '#FB923C'),
  ('Tasha','Palomino','tasha@eminat.net','Video Editor',                  true,  true,  '#F87171'),
  ('Wagner','Dueñas','wagner@eminat.net','Full Stack Developer',          true,  true,  '#FBB040'),
  ('Naomi','Panchana','naomi@eminat.net','Ejecutiva de Cuentas & CM',     true,  true,  '#60A5FA'),
  -- Inactivo: sus actividades históricas siguen resolviendo el nombre por FK
  ('Jonathan','Bula','jonathan@eminat.net','',                            false, false, '#9494B3')
) AS v(nombre, apellido, email, cargo, activo, en_equipo, color)
LEFT JOIN public.cargos c ON c.nombre = v.cargo
CROSS JOIN public.equipos e
WHERE e.codigo = 'MKT-GEN'
ON CONFLICT (email) DO NOTHING;

-- Líder del equipo Marketing = Freddy
UPDATE public.equipos
SET lider_id = (SELECT id FROM public.usuarios WHERE email = 'freddy@eminat.net')
WHERE codigo = 'MKT-GEN';
