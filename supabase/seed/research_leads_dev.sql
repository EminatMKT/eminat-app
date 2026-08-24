-- SEED dev/local de leads de Research. NO es una migración (no versionar en prod).
-- Prod tiene sus ~35 leads reales; esto existe para poder probar el CRM de 4 etapas
-- en local, donde la tabla arranca vacía (Kanban sin tarjetas, pie sin datos).
--
-- Cubre a propósito los casos que el recorrido de QA necesita:
--   · las 4 etapas, con más de un lead en algunas (para que el pie tenga proporciones)
--   · 'Sin respuesta' (archivada: sale del tablero, queda en la lista)
--   · una etapa LEGACY ('Discovery/Feasibility') — el CHECK sigue siendo la unión
--     y el dashboard es data-driven, así que debe mostrarla sin romperse
--   · países, sponsors y fases variados para los filtros y los gráficos
--   · un lead sin NCT# (contacto directo) y otro sin contacto (solo NCT#)
-- Idempotente por nct_number; el lead sin NCT se reinserta solo si no está el título.

INSERT INTO public.research_leads
  (date_added, nct_number, official_title, conditions, phase, study_type, recruitment_status,
   countries, lead_sponsor, sponsor_type, stage, contact_name, contact_role, contact_email, notes)
SELECT v.* FROM (VALUES
  ('2026-07-02'::date, 'NCT05512001', 'A Study of Semaglutide in Adults With Obesity and Prediabetes', 'Obesity; Prediabetes', 'Phase 3', 'Interventional', 'Recruiting', 'Spain; Portugal', 'Novo Nordisk', 'Industry', 'Nuevo', 'María Ferrer', 'Site Manager', 'mferrer@example.org', 'Entró por el sitio de CT.gov'),
  ('2026-07-05'::date, 'NCT05512002', 'Evaluation of a Digital Therapeutic for Chronic Insomnia', 'Insomnia', 'N/A', 'Interventional', 'Recruiting', 'Spain', 'Universidad de Barcelona', 'Academic', 'Nuevo', NULL, NULL, NULL, 'Sin contacto todavía — solo el registro'),
  ('2026-06-18'::date, 'NCT05512003', 'Long-term Safety of Dupilumab in Moderate Atopic Dermatitis', 'Atopic Dermatitis', 'Phase 3', 'Interventional', 'Active, not recruiting', 'Spain; France; Italy', 'Sanofi', 'Industry', 'Contactado', 'Jean-Luc Marchand', 'Clinical Ops Lead', 'jl.marchand@example.org', 'Primer correo enviado el 20/06, pidieron el brochure'),
  ('2026-06-22'::date, 'NCT05512004', 'Cardiac Rehabilitation With Remote Monitoring After Myocardial Infarction', 'Myocardial Infarction', 'Phase 2', 'Interventional', 'Recruiting', 'Spain; Germany', 'Medtronic', 'Industry', 'Contactado', 'Anke Vogel', 'Study Coordinator', 'a.vogel@example.org', 'Reunión agendada para la semana próxima'),
  ('2026-05-30'::date, 'NCT05512005', 'Adjuvant Immunotherapy in Resected Stage III Melanoma', 'Melanoma', 'Phase 3', 'Interventional', 'Recruiting', 'Spain; USA', 'Merck', 'Industry', 'Ganado', 'Sofía Rincón', 'Regional CRA', 'srincon@example.org', 'Contrato firmado — arranca en septiembre'),
  ('2026-05-12'::date, 'NCT05512006', 'Observational Registry of Early-Onset Parkinson Disease', 'Parkinson Disease', 'N/A', 'Observational', 'Enrolling by invitation', 'Spain', 'Fundación Neuro', 'Non-profit', 'Sin respuesta', 'Pablo Sáenz', 'Director', 'psaenz@example.org', 'Tres correos sin respuesta desde abril'),
  ('2026-04-28'::date, 'NCT05512007', 'Biomarkers of Response to Anti-VEGF Therapy in Diabetic Macular Edema', 'Diabetic Macular Edema', 'Phase 2', 'Interventional', 'Completed', 'Portugal', 'Bayer', 'Industry', 'Discovery/Feasibility', 'Rita Almeida', 'Feasibility', 'ralmeida@example.org', 'ETAPA LEGACY a propósito: el dashboard debe mostrarla sin romperse')
) AS v(date_added, nct_number, official_title, conditions, phase, study_type, recruitment_status,
       countries, lead_sponsor, sponsor_type, stage, contact_name, contact_role, contact_email, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.research_leads r WHERE r.nct_number = v.nct_number);

-- Lead sin NCT#: llegó por contacto directo, no por el registro.
INSERT INTO public.research_leads
  (date_added, official_title, conditions, study_type, countries, lead_sponsor, sponsor_type,
   stage, contact_name, contact_role, contact_email, contact_source, notes)
SELECT '2026-07-10'::date, 'Programa de tamizaje cardiovascular en atención primaria', 'Cardiovascular Risk',
       'Observational', 'Spain', 'Hospital Clínic', 'Academic', 'Nuevo', 'Elena Prats', 'Investigadora principal',
       'eprats@example.org', 'Referido por Freddy', 'Sin NCT#: contacto directo, no está en CT.gov'
WHERE NOT EXISTS (
  SELECT 1 FROM public.research_leads r
  WHERE r.official_title = 'Programa de tamizaje cardiovascular en atención primaria'
);
