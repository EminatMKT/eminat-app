-- Módulo Reuniones, fase 1: los triggers. Lo que las policies no pueden expresar.
-- Las policies gatean el ACCESO; estos triggers gatean la LÓGICA.

BEGIN;

-- El {NNN} es por empresa y por día, así que no hay SEQUENCE que sirva. Contar filas y sumar uno
-- es una condición de carrera: dos altas simultáneas leen el mismo máximo y el UNIQUE rechaza la
-- segunda con un error crudo. El advisory lock serializa sólo ese par (empresa, fecha) y se
-- libera solo al terminar la transacción.
CREATE OR REPLACE FUNCTION public.set_codigo_reunion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NEW.codigo IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.empresa || NEW.fecha::text));
  SELECT count(*) + 1 INTO n FROM public.reuniones
   WHERE empresa = NEW.empresa AND fecha = NEW.fecha;
  NEW.codigo := 'MTG-' || NEW.empresa || '-' || to_char(NEW.fecha, 'YYYYMMDD') || '-' || lpad(n::text, 3, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_codigo_reunion ON public.reuniones;
CREATE TRIGGER trg_codigo_reunion BEFORE INSERT ON public.reuniones
  FOR EACH ROW EXECUTE FUNCTION public.set_codigo_reunion();

-- `fecha_original` es el plazo con el que el pendiente nació: sólo sirve si nadie puede tocarlo.
-- Que el cliente lo respete es exactamente lo que no funciona. Se ignora el intento en vez de
-- abortar, porque un UPDATE que mande el objeto entero no tiene por qué fallar por un campo que
-- no cambió de intención.
CREATE OR REPLACE FUNCTION public.proteger_fecha_original()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.fecha_original := NEW.fecha_comprometida;
  ELSIF NEW.fecha_original IS DISTINCT FROM OLD.fecha_original THEN
    NEW.fecha_original := OLD.fecha_original;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fecha_original ON public.reunion_pendientes;
CREATE TRIGGER trg_fecha_original BEFORE INSERT OR UPDATE ON public.reunion_pendientes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_fecha_original();

-- Un acta cerrada es de sólo lectura. El repo ya usa este patrón en `prevent_rol_self_change`.
CREATE OR REPLACE FUNCTION public.proteger_acta_cerrada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_id uuid;
BEGIN
  -- Va en dos ramas IF y NO en un CASE de una sola expresión: plpgsql compila la expresión
  -- entera de una asignación, así que `OLD.reunion_id` se resuelve aunque la rama no se tome, y
  -- sobre `reuniones` —que no tiene esa columna— reventaba TODO update y delete con
  -- `record "old" has no field "reunion_id"`. Cada IF es una sentencia aparte y se compila sola.
  IF TG_TABLE_NAME = 'reuniones' THEN
    r_id := COALESCE(OLD.id, NEW.id);
  ELSE
    r_id := COALESCE(OLD.reunion_id, NEW.reunion_id);
  END IF;
  IF public.is_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF EXISTS (SELECT 1 FROM public.reuniones WHERE id = r_id AND estado = 'cerrada') THEN
    RAISE EXCEPTION 'el acta está cerrada: no se puede modificar';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_acta_cerrada ON public.reuniones;
CREATE TRIGGER trg_acta_cerrada BEFORE UPDATE OR DELETE ON public.reuniones
  FOR EACH ROW EXECUTE FUNCTION public.proteger_acta_cerrada();
DROP TRIGGER IF EXISTS trg_acta_cerrada ON public.reunion_temas;
CREATE TRIGGER trg_acta_cerrada BEFORE INSERT OR UPDATE OR DELETE ON public.reunion_temas
  FOR EACH ROW EXECUTE FUNCTION public.proteger_acta_cerrada();
DROP TRIGGER IF EXISTS trg_acta_cerrada ON public.reunion_participantes;
CREATE TRIGGER trg_acta_cerrada BEFORE INSERT OR UPDATE OR DELETE ON public.reunion_participantes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_acta_cerrada();

-- `reunion_pendientes` NO lleva este trigger, a propósito: su UPDATE tiene que seguir funcionando
-- con el acta cerrada, o el arrastre de un pendiente a la reunión siguiente no existe.

COMMIT;
