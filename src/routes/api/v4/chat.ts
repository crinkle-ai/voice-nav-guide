import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { systemPromptFor } from "@/lib/v4/prompts";
import type { IntakeMode } from "@/lib/v3/intake-types";
import type { HybridPath } from "@/lib/v4/session-store";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const TOOL_INSTRUCTIONS = `
You can render rich content inline in the chat by calling tools:

• askQuestionnaire — when you need 2+ structured answers at once (priorities, picking
  preferences, comparing trade-offs). Prefer this over asking many questions in plain text.

• recommendPlans — call this ONLY when your confidence is ≥ 80 (see system prompt).
  Your goal is to recommend ONE coverage STRATEGY (medicare-advantage, medigap-plus-partd,
  or dsnp) plus the specific plan(s) that carry it out. Each call MUST include:
    - strategy: "medicare-advantage" | "medigap-plus-partd" | "dsnp"
    - recommendedPlanId: the single primary plan (for medigap-plus-partd this is the Medigap plan)
    - pairedPlanId: REQUIRED when strategy = "medigap-plus-partd" — the standalone Part D
      plan that pairs with the Medigap plan. Both ids MUST also appear in plans[].
    - strategyRationale: 1-2 short sentences explaining the OVERALL approach in plain
      language ("Medigap fits your travel; Part D fills the drug gap")
    - confidence: integer 0-100
    - plans: 2-4 Crinkle Health plans total (recommended + paired PDP if any + 1-2 runners-up)
    - rationale[] for every plan with reasons grounded in the caller's intake (doctors,
      meds, conditions, ZIP, budget, medicaid, priorities, travel). Use sourceField values
      like "doctors", "medications", "budget", "zip", "medicaid", "priorities", "travel".
  Plans MUST come from the Crinkle Health lineup in the system prompt. Carrier is always
  "Crinkle Health". Premiums are plausible TYPICAL ranges, not guarantees. If confidence
  is below 80, do NOT call this tool — ask the ONE most useful narrowing question instead.

• suggestNext — after most assistant turns, offer 2–5 short quick-reply chips the caller
  can tap. After a recommendation, include actions like "Verify my doctors",
  "Check my prescriptions", "Compare with my second choice", "Explain why you chose this",
  "Talk with a licensed advisor".

Use plain text for normal conversational replies. Use tools to add structure, never to
replace your written reply. If you don't know an answer, SAY SO in one short sentence per
the system prompt's fallback rule — never go silent, never fabricate.

CRITICAL TOOL-CALL FORMAT: When you decide to use a tool, you MUST invoke it through the
tool-call mechanism. NEVER write the tool name (e.g. "recommendPlans"), its arguments, or
a JSON-like representation of its arguments inside your assistant text. The user sees your
text verbatim — leaked tool syntax looks broken. If you want plans on screen, CALL
recommendPlans; do not describe the plans in prose.
`.trim();

export const Route = createFileRoute("/api/v4/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          mode?: IntakeMode;
          path?: HybridPath;
          intakeSnapshot?: unknown;
        };
        const messages = body.messages;
        const mode: IntakeMode = body.mode ?? "ramble";
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);

        const intakeNote = body.intakeSnapshot
          ? `\n\nCURRENT INTAKE SNAPSHOT (use these specific values when justifying plan picks):\n${JSON.stringify(body.intakeSnapshot).slice(0, 4000)}`
          : "";

        const system = `${systemPromptFor(mode, body.path)}\n\n${TOOL_INSTRUCTIONS}${intakeNote}`;

        const tools = {
          askQuestionnaire: tool({
            description: "Render an inline mini-questionnaire (single/multi/text fields) in the chat.",
            inputSchema: z.object({
              title: z.string(),
              questions: z.array(
                z.object({
                  id: z.string(),
                  label: z.string(),
                  type: z.enum(["single", "multi", "text"]),
                  options: z.array(z.string()).optional(),
                }),
              ).min(1).max(6),
            }),
            execute: async (input) => ({ ok: true, rendered: input }),
          }),
          recommendPlans: tool({
            description:
              "Render a confident plan recommendation: ONE recommended plan plus 1-3 runners-up, with per-plan rationale tied to intake. Only call when confidence is at least 80.",
            inputSchema: z.object({
              strategy: z
                .enum(["medicare-advantage", "medigap-plus-partd", "dsnp"])
                .describe(
                  "The overall coverage strategy. 'medigap-plus-partd' MUST include a pairedPlanId Part D plan.",
                ),
              recommendedPlanId: z.string().describe("The single plan id you are recommending. Must match an id in plans[]. For 'medigap-plus-partd', this is the Medigap plan."),
              pairedPlanId: z.string().optional().describe("REQUIRED when strategy = 'medigap-plus-partd': the standalone Part D plan id that pairs with the Medigap plan. Must also appear in plans[]."),
              strategyRationale: z
                .string()
                .describe("1-2 short sentences in plain English explaining WHY this coverage strategy fits the caller's stated needs."),
              confidence: z.number().min(0).max(100).describe("Your confidence in this recommendation, 0-100. Must be >= 80 to call this tool."),
              plans: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  carrier: z.string(),
                  type: z.string(),
                  monthlyPremium: z.number(),
                  maxOOP: z.number(),
                  starRating: z.number().optional(),
                  highlights: z.array(z.string()).optional(),
                }),
              ).min(1).max(4),
              rationale: z.array(
                z.object({
                  planId: z.string(),
                  reasons: z.array(
                    z.object({
                      label: z.string(),
                      detail: z.string(),
                      sourceField: z.string().optional(),
                    }),
                  ).min(1),
                }),
              ),
            }),
            execute: async (input) => ({ ok: true, rendered: input }),
          }),
          suggestNext: tool({
            description: "Show 2-5 quick-reply chips under the assistant reply.",
            inputSchema: z.object({
              chips: z.array(z.string()).min(2).max(5),
            }),
            execute: async (input) => ({ ok: true, rendered: input }),
          }),
        };

        try {
          const result = streamText({
            model: gateway(DEFAULT_MODEL),
            system,
            messages: await convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(5),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err) {
          console.error("v4 chat error", err);
          return new Response("AI request failed", { status: 500 });
        }
      },
    },
  },
});
