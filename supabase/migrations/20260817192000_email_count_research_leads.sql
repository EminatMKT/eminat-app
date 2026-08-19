-- Contador de intentos de contacto por estudio (reunión con Federico del 12/08/2026).
--
-- Royner manda los correos FUERA del CRM (cadencia de 3 toques desde su cuenta de Eminat) y
-- registra después. Hoy el dashboard muestra 81 leads únicos cuando el esfuerzo real fueron
-- ~165–170 alcances: esta columna es la que hace visible ese trabajo.
--
-- NULL vs 0 es una distinción deliberada y el código depende de ella:
--   NULL = todavía no se registró ningún intento ("no lo informé")
--   0    = se afirma que no se envió ningún correo
-- Por eso NO lleva DEFAULT 0: un default convertiría "sin informar" en "cero correos" para las
-- ~35 filas existentes, y el import trata la celda vacía como "no pisar" apoyándose en el NULL.
alter table public.research_leads
  add column if not exists email_count integer;

-- Un contador de correos enviados no puede ser negativo. NULL pasa el CHECK (no se valida).
alter table public.research_leads
  drop constraint if exists research_leads_email_count_nonneg;
alter table public.research_leads
  add constraint research_leads_email_count_nonneg check (email_count is null or email_count >= 0);

comment on column public.research_leads.email_count is
  'Intentos de contacto registrados (correos enviados al estudio). NULL = ninguno registrado, distinto de 0. Lo escribe el pop-up con confirmación del CRM o el import de CSV.';
