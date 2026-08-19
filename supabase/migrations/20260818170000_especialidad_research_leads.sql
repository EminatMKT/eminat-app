-- Especialidad médica del estudio (Prioridad 4 de la reunión con Federico del 12/08/2026):
-- vistas de resumen por especialidad / sponsor / fase para las conversaciones con farmacéuticas
-- ("AstraZeneca tiene 10 estudios, 5 en esta condición, todos fase 3").
--
-- El dato NO viene servido por clinicaltrials.gov: la API v2 no tiene campo `specialty`. Se
-- DERIVA de las raíces MeSH que sí trae (`derivedSection.conditionBrowseModule`), en unas 3 de
-- cada 4 fichas; el cuarto restante lo completa una persona desde el CRM. La medición y el
-- detalle están en docs/requerimientos-crm-research-2026-08-12.md, subsección "Averiguado el
-- 18/08/2026", y la derivación en features/research/utils/specialty.ts.
--
-- NULL vs 'Otras' es una distinción deliberada, igual que NULL vs 0 en email_count:
--   NULL    = todavía no se clasificó (ni la máquina pudo, ni una persona la miró)
--   'Otras' = una persona la miró y no encaja en ninguna de las 15
-- Por eso NO lleva DEFAULT: un default convertiría "sin clasificar" en una afirmación que
-- nadie hizo, y el import trata la celda vacía como "no pisar" apoyándose en ese NULL.
alter table public.research_leads
  add column if not exists especialidad text;

-- Dominio cerrado: el único motivo por el que existe la columna es poder CONTAR por
-- especialidad, y el texto libre reintroduce justo el problema que se está resolviendo
-- ("Oncología", "oncologia" y "Onco" contarían como tres). El orden replica el de prioridad
-- de MESH_ROOTS en features/research/utils/specialty.ts.
alter table public.research_leads
  drop constraint if exists research_leads_especialidad_check;
alter table public.research_leads
  add constraint research_leads_especialidad_check check (
    especialidad is null or especialidad = any (array[
      'Oncología'::text, 'Hematología'::text, 'Cardiología'::text, 'Neurología'::text,
      'Psiquiatría'::text, 'Endocrinología'::text, 'Infectología'::text, 'Neumología'::text,
      'Gastroenterología'::text, 'Reumatología'::text, 'Dermatología'::text,
      'Oftalmología'::text, 'Ginecología'::text, 'Urología'::text, 'Inmunología'::text,
      'Otras'::text
    ])
  );

comment on column public.research_leads.especialidad is
  'Especialidad médica del estudio (dominio cerrado de 15 + Otras). Se deriva de las raíces MeSH de clinicaltrials.gov al cargar el lead por NCT#, o la elige una persona. NULL = sin clasificar, distinto de Otras.';
