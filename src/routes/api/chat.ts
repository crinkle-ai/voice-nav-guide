import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are the Medicare Navigator — a warm, patient voice guide helping someone (often a senior) understand Medicare and choose a plan.

Style:
- Plain English, short sentences, no jargon. If you must use a term (deductible, premium, network), define it briefly.
- Replies under 3 sentences unless asked for more.
- Always reassure; never rush.

When the user wants to go somewhere or see something, USE TOOLS rather than just describing:
- navigate_to: move them to /, /learn, /find-doctors, or /compare-plans.
- highlight_section: point out a specific section on the current page (e.g. "part-a", "glossary", "premium-filter").
- search_doctors: actually query the doctor database.
- recommend_plans: actually query the plans database and surface 2-3 matches.

After calling a tool, briefly tell the user what you did and what to look at.`;

const PAGE_VALUES: ["/", "/learn", "/find-doctors", "/compare-plans"] = ["/", "/learn", "/find-doctors", "/compare-plans"];

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
          stopWhen: stepCountIs(50),
          tools: {
            navigate_to: tool({
              description: "Navigate the user to one of the app pages.",
              inputSchema: z.object({ page: z.enum(PAGE_VALUES) }),
              execute: async ({ page }) => ({ navigated: page }),
            }),
            highlight_section: tool({
              description: "Highlight and scroll to a section id on the current page.",
              inputSchema: z.object({ section: z.string().min(1).max(60) }),
              execute: async ({ section }) => ({ highlighted: section }),
            }),
            search_doctors: tool({
              description: "Search doctors by specialty and/or city. Returns matches.",
              inputSchema: z.object({
                specialty: z.string().max(60).optional(),
                city: z.string().max(60).optional(),
              }),
              execute: async ({ specialty, city }) => {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                let q = supabaseAdmin
                  .from("doctors")
                  .select("name,specialty,city,state,phone,accepting_new_patients")
                  .limit(5);
                if (specialty) q = q.ilike("specialty", `%${specialty}%`);
                if (city) q = q.ilike("city", `%${city}%`);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { count: data?.length ?? 0, doctors: data ?? [] };
              },
            }),
            recommend_plans: tool({
              description: "Recommend Medicare plans matching the user's needs.",
              inputSchema: z.object({
                needs_drug: z.boolean().optional(),
                max_premium: z.number().min(0).max(10000).optional(),
                type: z.string().max(50).optional(),
              }),
              execute: async ({ needs_drug, max_premium, type }) => {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                let q = supabaseAdmin
                  .from("plans")
                  .select("name,type,carrier,monthly_premium,annual_deductible,star_rating,summary,drug_coverage,dental,vision")
                  .order("monthly_premium")
                  .limit(3);
                if (needs_drug) q = q.eq("drug_coverage", true);
                if (typeof max_premium === "number") q = q.lte("monthly_premium", max_premium);
                if (type) q = q.eq("type", type);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { count: data?.length ?? 0, plans: data ?? [] };
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] });
      },
    },
  },
});
