-- New pipeline stage requested by Federico Salviche (email 2026-10-06, thread "Update CRM
-- stages"): a lead that's been contacted and is in active management but not yet closed (e.g.
-- Bayer, Otsuka, Nestlé) has nowhere to live today between 'Contactado' and 'Ganado', so it gets
-- shoehorned into one of the two. Same pattern as 20260721225916: UNION of the old array plus
-- the new value, never a replacement, so no existing lead stops passing the CHECK.
--
-- Reclassifying existing leads is Federico's team's job from the app, not this migration.

ALTER TABLE "public"."research_leads"
  DROP CONSTRAINT "research_leads_stage_check";

ALTER TABLE "public"."research_leads"
  ADD CONSTRAINT "research_leads_stage_check" CHECK (
    "stage" = ANY (ARRAY[
      'Nuevo'::text, 'Contactado'::text, 'En comunicación'::text, 'Ganado'::text,
      'Sin respuesta'::text, 'Identificado'::text, 'Calificado'::text, 'Outreach'::text,
      'Contacto'::text, 'Discovery/Feasibility'::text, 'Docs'::text, 'Negociación'::text,
      'Awarded'::text, 'Cerrado'::text
    ])
  );
