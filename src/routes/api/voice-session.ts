import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

const SYSTEM_PROMPT = `You are the Medicare Navigator — a warm, patient voice guide for someone (often a senior) exploring Medicare.

Style:
- Plain English, short sentences, no jargon. Define any term you must use.
- Replies under 3 sentences unless asked for more.
- Reassure, never rush. Speak naturally with brief pauses.

You are guiding them through a live website. When they want to see, go, or compare something, CALL TOOLS instead of just describing:
- navigate_to: move to "/", "/learn", "/find-doctors", or "/compare-plans".
- highlight_section: scroll to and outline a section on the current page (e.g. "part-a", "glossary", "premium-filter").

After calling a tool, say one short sentence about what you're showing them.`;

export const Route = createFileRoute("/api/voice-session")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        try {
          const client = new GoogleGenAI({
            apiKey,
            httpOptions: { apiVersion: "v1alpha" },
          });

          // deno-lint-ignore no-explicit-any
          const authTokens = (client as unknown as { authTokens?: { create: (args: unknown) => Promise<{ name?: string; expireTime?: string }> } }).authTokens;
          if (!authTokens) {
            return Response.json({ error: "authTokens API not available in @google/genai" }, { status: 500 });
          }

          const token = await authTokens.create({
            config: {
              uses: 1,
              liveConnectConstraints: {
                model: GEMINI_MODEL,
                config: {
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
                  },
                  systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                  outputAudioTranscription: {},
                  inputAudioTranscription: {},
                  realtimeInputConfig: {
                    automaticActivityDetection: {
                      endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                      silenceDurationMs: 400,
                      startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                    },
                  },
                  tools: [
                    {
                      functionDeclarations: [
                        {
                          name: "navigate_to",
                          description: "Navigate the live website to one of the app pages.",
                          parameters: {
                            type: "OBJECT",
                            properties: {
                              page: {
                                type: "STRING",
                                enum: ["/", "/learn", "/find-doctors", "/compare-plans"],
                              },
                            },
                            required: ["page"],
                          },
                        },
                        {
                          name: "highlight_section",
                          description: "Scroll to and outline a section by id on the current page.",
                          parameters: {
                            type: "OBJECT",
                            properties: {
                              section: { type: "STRING", description: "Section id, e.g. part-a" },
                            },
                            required: ["section"],
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          });

          if (!token?.name) {
            return Response.json({ error: "Failed to mint Gemini Live token" }, { status: 500 });
          }

          const websocketUrl = `${LIVE_WS_URL}?access_token=${encodeURIComponent(token.name)}`;
          return Response.json({
            websocketUrl,
            model: GEMINI_MODEL,
            expireTime: token.expireTime ?? null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("[voice-session] error", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
