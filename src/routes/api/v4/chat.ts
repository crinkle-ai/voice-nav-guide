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

• recommendPlans — call this WHENEVER you surface specific plan options. Plans MUST come
  from the UnitedHealthcare lineup described in the system prompt (AARP Medicare Advantage
  HMO/PPO, AARP Dual Complete D-SNP, AARP Medicare Supplement Plan G/N, AARP Medicare Rx PDP).
  Carrier is always "UnitedHealthcare". Premiums are plausible TYPICAL ranges, not guarantees.
  You MUST include a rationale[] entry for every plan with concrete reasons that cite the
  caller's own intake (doctors named, medications, conditions, ZIP, budget, Medicaid status,
  travel patterns). Use sourceField values like "doctors", "medications", "budget", "zip",
  "medicaid", "priorities", "travel". Never recommend plans without rationale. As you learn
  more about the caller, NARROW the set — surface fewer, better-fitting plans, not more.

• suggestNext — after most assistant turns, offer 2–4 short quick-reply chips the caller
  can tap (e.g. "Yes, that's right", "Tell me more", "Skip this", "Talk to an agent").

Use plain text for normal conversational replies. Use tools to add structure, never to
replace your written reply. If you don't know an answer, SAY SO in one short sentence per
the system prompt's fallback rule — never go silent, never fabricate.
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
          }),
          recommendPlans: tool({
            description: "Render plan recommendations with per-plan rationale tied to intake.",
            inputSchema: z.object({
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
          }),
          suggestNext: tool({
            description: "Show 2-4 quick-reply chips under the assistant reply.",
            inputSchema: z.object({
              chips: z.array(z.string()).min(2).max(4),
            }),
          }),
        };

        try {
          const result = streamText({
            model: gateway(DEFAULT_MODEL),
            system,
            messages: await convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(50),
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
