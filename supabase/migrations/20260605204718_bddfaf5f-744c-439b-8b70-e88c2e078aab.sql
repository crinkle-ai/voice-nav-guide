
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  accepting_new_patients BOOLEAN NOT NULL DEFAULT true,
  medicare_assignment BOOLEAN NOT NULL DEFAULT true,
  network_tags TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{English}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctors TO anon, authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);

CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  carrier TEXT NOT NULL,
  monthly_premium NUMERIC(8,2) NOT NULL,
  annual_deductible NUMERIC(8,2) NOT NULL,
  oop_max NUMERIC(8,2),
  drug_coverage BOOLEAN NOT NULL DEFAULT false,
  dental BOOLEAN NOT NULL DEFAULT false,
  vision BOOLEAN NOT NULL DEFAULT false,
  hearing BOOLEAN NOT NULL DEFAULT false,
  star_rating NUMERIC(2,1),
  summary TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read plans" ON public.plans FOR SELECT USING (true);
