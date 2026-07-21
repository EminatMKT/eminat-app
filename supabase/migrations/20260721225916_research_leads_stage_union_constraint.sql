-- CRM de research pasó de 9 etapas a 4 propias (Nuevo · Contactado · Ganado · Sin respuesta),
-- reunión 2026-07-20. El código ya inserta leads nuevos con stage='Nuevo', pero el CHECK viejo
-- solo aceptaba las 9 etapas legacy → el alta de leads rompía (23514 check_violation).
--
-- Fix seguro y sin decisión de mapeo: constraint = UNIÓN de las 4 nuevas + las 9 viejas.
-- Desbloquea el alta ya y no toca ningún lead existente (todos siguen válidos). La persona que
-- maneja los leads reclasifica los legacy a las 4 nuevas a su ritmo desde la app.
-- Un migration posterior apretará el CHECK a solo-4 cuando esa migración de datos esté hecha.

ALTER TABLE "public"."research_leads"
  DROP CONSTRAINT "research_leads_stage_check";

ALTER TABLE "public"."research_leads"
  ADD CONSTRAINT "research_leads_stage_check" CHECK (
    "stage" = ANY (ARRAY[
      -- 4 nuevas (canónicas)
      'Nuevo'::text, 'Contactado'::text, 'Ganado'::text, 'Sin respuesta'::text,
      -- 9 legacy (transición; se quitan tras remapear los datos)
      'Identificado'::text, 'Calificado'::text, 'Outreach'::text, 'Contacto'::text,
      'Discovery/Feasibility'::text, 'Docs'::text, 'Negociación'::text,
      'Awarded'::text, 'Cerrado'::text
    ])
  );

-- Default de un lead nuevo sin stage explícito: la primera etapa del pipeline nuevo.
ALTER TABLE "public"."research_leads"
  ALTER COLUMN "stage" SET DEFAULT 'Nuevo'::text;
