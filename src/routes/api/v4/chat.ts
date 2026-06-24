import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { systemPromptFor } from "@/lib/v4/prompts";
import type { IntakeMode } from "@/lib/v3/intake-types";
import type { HybridPath } from "@/lib/v4/session-store";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export const Route = createFileRoute("/api/v4/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          mode?: IntakeMode;
          path?: HybridPath;
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
            system: systemPromptFor(mode, body.path),
            messages: await convertToModelMessages(messages),
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
