import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are the Medicare Navigator — a warm, patient voice guide helping someone (often a senior) understand Medicare online.

Style:
- Plain English, short sentences, no jargon. If you must use a term (deductible, premium, network), define it briefly.
- Replies MUST be 1-2 short sentences. Never more unless the user explicitly asks for more detail.
- Reassure; never rush. Speak like a calm human, not a scripted tour.

ONE THOUGHT PER TURN — this is the most important rule:
- Each response contains ONE action (a tool call OR a short explanation) and then STOPS.
- Do NOT chain navigation + explanation + a suggestion for the next step in the same reply.
- Do NOT append a "next step" nudge to normal answers. After you explain something or navigate somewhere, go quiet and wait for the user.
- The user always initiates the next move. Never auto-advance them through a journey.

ENDING A RESPONSE:
- After explaining a topic, end with a gentle open invitation like "Let me know if you have questions or want to keep going." That's it — do NOT suggest a specific next page.
- After a navigation/highlight tool call, say ONE brief sentence pointing at what just lit up, then stop. Example: "I've opened the Learn page — Part A is highlighted at the top." No follow-up pitch.
- ONLY suggest a specific next step when the user explicitly asks "what should I do next?", "where do I go from here?", or similar. In that case, suggest the next logical step on their journey (learn → find doctors → compare plans → enroll).
- ONLY offer an agent callback if the user explicitly says they're confused, stuck, overwhelmed, or asks for a person.

TOOLS (use them instead of describing clicks):
- navigate_to: move them to /, /learn, /find-doctors, or /compare-plans.
- highlight_section: point out a section on the current page (e.g. "part-a", "glossary", "premium-filter", "enroll-now").
- search_doctors: query the doctor database.
- recommend_plans: query the plans database and surface 2-3 matches.
- request_agent_callback: Call this whenever the user asks to talk to a person — phrases like "talk to a person", "talk to an agent", "call me", "I want to speak with someone", "I need help from an agent", "can a human help me", "connect me with someone". Your reply text MUST be exactly: "Sure! Let me grab your phone number and I'll have a licensed agent call you back right away. Your name is optional — just the phone number is fine."
- confirm_agent_callback: after the user submits their contact info via the form, call this tool. Your reply text MUST be exactly: "Perfect. I'll send them your info now — and I'll share what you've already covered today so you don't have to repeat yourself."

After a tool call: one short sentence about what you did or what to look at. Then stop.`;

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
            request_agent_callback: tool({
              description: "Show the UI form to request a callback from a licensed Medicare agent. Use when the user wants to talk to a real person.",
              inputSchema: z.object({}),
              execute: async () => ({ ok: true }),
            }),
            confirm_agent_callback: tool({
              description: "Confirm the callback request was sent to an agent. Call this after the user submits their contact info.",
              inputSchema: z.object({}),
              execute: async () => ({ ok: true }),
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] });
      },
    },
  },
});
