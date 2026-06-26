
-- providers seeded from NPPES
CREATE TABLE public.providers_55410 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npi text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  credential text,
  primary_taxonomy text,
  specialty_label text NOT NULL,
  address_line1 text,
  city text,
  state text,
  zip text,
  phone text,
  in_network_plans text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.providers_55410 TO anon, authenticated;
GRANT ALL ON public.providers_55410 TO service_role;
ALTER TABLE public.providers_55410 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read providers_55410" ON public.providers_55410 FOR SELECT USING (true);

-- 5 demo plans for ZIP 55410
CREATE TABLE public.demo_plans_55410 (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  carrier text NOT NULL DEFAULT 'UnitedHealthcare',
  monthly_premium numeric NOT NULL,
  annual_deductible numeric NOT NULL DEFAULT 0,
  moop numeric NOT NULL,
  pcp_copay numeric NOT NULL DEFAULT 0,
  specialist_copay numeric NOT NULL DEFAULT 0,
  network_id text NOT NULL,
  extras text[] NOT NULL DEFAULT '{}',
  star_rating numeric,
  requires_medicaid boolean NOT NULL DEFAULT false,
  summary text NOT NULL,
  highlights text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_plans_55410 TO anon, authenticated;
GRANT ALL ON public.demo_plans_55410 TO service_role;
ALTER TABLE public.demo_plans_55410 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read demo_plans_55410" ON public.demo_plans_55410 FOR SELECT USING (true);

-- formulary join
CREATE TABLE public.plan_formulary_55410 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.demo_plans_55410(id) ON DELETE CASCADE,
  rxcui text NOT NULL,
  drug_label text NOT NULL,
  tier int,
  covered boolean NOT NULL DEFAULT true,
  prior_auth boolean NOT NULL DEFAULT false,
  step_therapy boolean NOT NULL DEFAULT false,
  quantity_limit text,
  preferred_copay numeric,
  standard_copay numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, rxcui)
);
GRANT SELECT ON public.plan_formulary_55410 TO anon, authenticated;
GRANT ALL ON public.plan_formulary_55410 TO service_role;
ALTER TABLE public.plan_formulary_55410 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read plan_formulary_55410" ON public.plan_formulary_55410 FOR SELECT USING (true);

CREATE INDEX plan_formulary_55410_plan_idx ON public.plan_formulary_55410(plan_id);
CREATE INDEX plan_formulary_55410_rxcui_idx ON public.plan_formulary_55410(rxcui);
