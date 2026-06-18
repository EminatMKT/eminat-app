-- ============================================================================
-- Research Engine — Phase 1 schema
-- Run once in the Supabase SQL editor. Internal local-market-research module.
-- ============================================================================

-- 1. Projects --------------------------------------------------------------
create table if not exists public.research_projects (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  product_service  text,
  industry         text,
  location         text,
  city             text,
  state            text default 'FL',
  radius           numeric,                 -- miles
  target_audience  text,
  year_start       int,
  year_end         int,
  include_social   boolean default true,
  include_pricing  boolean default true,
  include_report   boolean default true,
  status           text default 'active',   -- active | archived
  created_by       text,
  created_at       timestamptz default now()
);

-- 2. Market demographics (per project) -------------------------------------
create table if not exists public.market_demographics (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.research_projects(id) on delete cascade,
  metric      text,        -- e.g. population, median_income, median_age, households
  label       text,        -- human label
  value       numeric,
  source      text,
  created_at  timestamptz default now()
);

-- 3. Competitors -----------------------------------------------------------
create table if not exists public.competitors (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.research_projects(id) on delete cascade,
  name         text not null,
  website      text,
  address      text,
  category     text,
  rating       numeric,     -- 0-5
  review_count int,
  price_level  text,        -- $, $$, $$$
  strengths    text,
  weaknesses   text,
  notes        text,
  created_at   timestamptz default now()
);

-- 4. Competitor pricing ----------------------------------------------------
create table if not exists public.competitor_pricing (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.research_projects(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  service_name  text,
  price         numeric,
  unit          text,        -- per session, per month, flat...
  notes         text,
  created_at    timestamptz default now()
);

-- 5. Social profiles -------------------------------------------------------
create table if not exists public.social_profiles (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.research_projects(id) on delete cascade,
  competitor_id   uuid references public.competitors(id) on delete set null,
  platform        text,      -- Instagram, Facebook, TikTok, YouTube, LinkedIn, Google
  handle          text,
  url             text,
  followers       int,
  engagement_rate numeric,   -- percent
  notes           text,
  created_at      timestamptz default now()
);

-- 6. Research insights (manual + AI) ---------------------------------------
create table if not exists public.research_insights (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid references public.research_projects(id) on delete cascade,
  source                      text default 'manual',   -- manual | ai
  title                       text,
  category                    text,                    -- for manual insights
  content                     text,                    -- freeform (manual)
  executive_summary           text,
  market_opportunity          text,
  competitor_weakness         text,
  pricing_recommendation      text,
  positioning_recommendation  text,
  marketing_recommendation    text,
  next_steps                  text,
  created_at                  timestamptz default now()
);

-- 7. Research sources ------------------------------------------------------
create table if not exists public.research_sources (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.research_projects(id) on delete cascade,
  title       text,
  url         text,
  type        text,        -- website, report, review, social, directory, other
  notes       text,
  created_at  timestamptz default now()
);

-- 8. Research reports (saved snapshots) ------------------------------------
create table if not exists public.research_reports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.research_projects(id) on delete cascade,
  title         text,
  payload       jsonb,       -- assembled report structure at generation time
  generated_by  text,
  generated_at  timestamptz default now()
);

-- Indexes for the per-project lookups the UI does constantly.
create index if not exists market_demographics_project_idx on public.market_demographics(project_id);
create index if not exists competitors_project_idx          on public.competitors(project_id);
create index if not exists competitor_pricing_project_idx   on public.competitor_pricing(project_id);
create index if not exists social_profiles_project_idx      on public.social_profiles(project_id);
create index if not exists research_insights_project_idx    on public.research_insights(project_id);
create index if not exists research_sources_project_idx     on public.research_sources(project_id);
create index if not exists research_reports_project_idx     on public.research_reports(project_id);
