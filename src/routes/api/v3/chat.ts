import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { SYSTEM_PROMPTS } from "@/lib/v3/prompts";
import type { IntakeMode } from "@/lib/v3/intake-types";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export const Route = createFileRoute("/api/v3/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          mode?: IntakeMode;
        };
        const messages = body.messages;
        const mode: IntakeMode = body.mode ?? "ramble";
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        try {
          const result = streamText({
            model: gateway(DEFAULT_MODEL),
            system: SYSTEM_PROMPTS[mode],
            messages: await convertToModelMessages(messages),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err) {
          console.error("v3 chat error", err);
          return new Response("AI request failed", { status: 500 });
        }
      },
    },
  },
});
