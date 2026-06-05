import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DoctorFilter = z.object({
  name: z.string().trim().max(100).optional(),
  specialty: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  zip: z.string().trim().max(20).optional(),
});

export const searchDoctors = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DoctorFilter.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("doctors").select("*").order("name");
    if (data.name) q = q.ilike("name", `%${data.name}%`);
    if (data.specialty) q = q.ilike("specialty", `%${data.specialty}%`);
    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.zip) q = q.eq("zip", data.zip);
    const { data: rows, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    return { doctors: rows ?? [] };
  });

const PlanFilter = z.object({
  type: z.string().trim().max(50).optional(),
  maxPremium: z.number().min(0).max(10000).optional(),
  needsDrug: z.boolean().optional(),
  needsDental: z.boolean().optional(),
  needsVision: z.boolean().optional(),
});

export const listPlans = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlanFilter.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("plans").select("*").order("monthly_premium");
    if (data.type) q = q.eq("type", data.type);
    if (typeof data.maxPremium === "number") q = q.lte("monthly_premium", data.maxPremium);
    if (data.needsDrug) q = q.eq("drug_coverage", true);
    if (data.needsDental) q = q.eq("dental", true);
    if (data.needsVision) q = q.eq("vision", true);
    const { data: rows, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    return { plans: rows ?? [] };
  });
