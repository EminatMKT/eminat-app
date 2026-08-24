-- Stratix leía las marcas de una constante hardcodeada (MARCAS_LIST) que se
-- desincronizó del catálogo `empresas`: 7 entradas contra 11 filas. El catálogo
-- tiene dos clases de empresa conviviendo — las que reciben actividades de
-- marketing y las que solo son lugar de pertenencia de una persona — y sin
-- distinguirlas el selector de actividades ofrecería "Ondara Media" como marca.

-- 1. Qué empresas reciben actividades. Default false: una empresa nueva es de
--    pertenencia salvo que el admin diga lo contrario.
ALTER TABLE public.empresas
  ADD COLUMN recibe_actividades boolean NOT NULL DEFAULT false;

-- Se marcan exactamente las 7 que MARCAS_LIST mostraba, para que el día del
-- deploy nadie vea un cambio de comportamiento: lo que cambia es que ahora se
-- administra desde /admin en vez de un deploy.
UPDATE public.empresas SET recibe_actividades = true
 WHERE codigo IN ('EMC','SVN','ERG','VNF','PREMIER','ORNELLA','MENTOR');

-- 2. Integridad por clave natural. `empresas.codigo` es UNIQUE y NOT NULL, y no
--    codifica ningún dato que ya viva por separado, así que sirve como destino
--    de FK — mismo criterio que `usuarios.rol -> roles.key`.
--    ON UPDATE CASCADE: renombrar un código desde el admin propaga a las
--    actividades. El borrado queda en RESTRICT (default): una empresa con
--    actividades no se puede borrar, solo desactivar.
ALTER TABLE public.actividades
  ADD CONSTRAINT actividades_empresa_fkey
  FOREIGN KEY (empresa) REFERENCES public.empresas(codigo) ON UPDATE CASCADE;

-- 3. La FK por uuid nunca se pobló (0 de 18 filas) ni tuvo call sites. Tener las
--    dos es tener dos fuentes de verdad que pueden divergir.
ALTER TABLE public.actividades DROP COLUMN empresa_id;
