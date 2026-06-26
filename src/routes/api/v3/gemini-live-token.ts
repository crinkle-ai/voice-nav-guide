import { createFileRoute } from "@tanstack/react-router";
import { SYSTEM_PROMPTS } from "@/lib/v3/prompts";
import { systemPromptFor as v4SystemPromptFor } from "@/lib/v4/prompts";
import type { IntakeMode } from "@/lib/v3/intake-types";
import type { HybridPath } from "@/lib/v4/session-store";

export const Route = createFileRoute("/api/v3/gemini-live-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response("Missing GEMINI_API_KEY", { status: 500 });
        }
        const body = (await request.json().catch(() => ({}))) as {
          mode?: IntakeMode;
          promptVersion?: "v3" | "v4";
          path?: HybridPath;
        };
        const mode: IntakeMode = body.mode ?? "hybrid";
        const isV4Prompt = body.promptVersion === "v4";
        const basePrompt = isV4Prompt ? v4SystemPromptFor(mode, body.path) : SYSTEM_PROMPTS[mode];

        const now = Date.now();
        const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();
        const expireTime = new Date(now + 30 * 60 * 1000).toISOString();

        const systemInstructionText = `${basePrompt}

VOICE MODE: You are speaking out loud over a phone-like voice channel.
Keep replies tight (1-3 short sentences). Use natural spoken language, no
markdown, no bullet lists, no headings. Pause and let the caller talk.${
          isV4Prompt
            ? '\n\nNever tell the caller to click or use "Finish intake" to see plans or matches. If plan options are ready, say you can show options right here in the chat.'
            : ""
        }`;

        const tokenRes = await fetch(
          `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expireTime, newSessionExpireTime }),
          },
        );

        if (!tokenRes.ok) {
          const text = await tokenRes.text().catch(() => "");
          return new Response(`Token mint failed: ${tokenRes.status} ${text}`, {
            status: 502,
          });
        }
        const data = (await tokenRes.json()) as { name?: string };
        if (!data.name) {
          return new Response("Token mint returned no name", { status: 502 });
        }

        return Response.json({
          token: data.name,
          systemInstruction: systemInstructionText,
          model: "gemini-2.5-flash-native-audio-latest",
        });
      },
    },
  },
});
