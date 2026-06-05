import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

const SYSTEM_PROMPT = `You are the Medicare Navigator — a warm, patient voice guide for someone (often a senior) exploring Medicare on a live website.

Style:
- Plain English, short sentences, no jargon. Define any term you must use.
- Replies under 3 sentences unless asked for more.
- Reassure, never rush. Speak naturally.

You guide the user through the live website by calling tools. Tools take effect immediately — DO NOT just describe what they should click.

TOOL RULES:
- navigate_to: ONLY call when the user is not already on the right page. After navigation, also call highlight_section to point at the exact area you're talking about.
- highlight_section: ALWAYS call this when explaining anything tied to a specific area of the current page. This is what makes you feel like a guide. Call it BEFORE you start explaining so the user is looking at the right thing.

After each tool call, say one short sentence pointing the user at what just lit up ("See that highlighted box on the left? That's…").

You'll receive system updates like "[CURRENT PAGE: /learn]" — trust them as the user's current location.

SECTION CATALOG (use these exact ids with highlight_section):

/  (home):
  - "hero" — top hero, tagline, "Talk to your guide" button
  - "try-asking" — card with example questions on the right
  - "steps" — the 3-step path (Learn, Find Doctors, Compare Plans)
  - "trust" — bottom trust strip

/learn:
  - "part-a" — Part A: Hospital coverage
  - "part-b" — Part B: Medical / doctor visits
  - "part-c" — Part C: Medicare Advantage
  - "part-d" — Part D: Prescription drugs
  - "medigap" — Medigap / Supplement plans
  - "glossary" — full glossary section
  - "glossary-premium", "glossary-deductible", "glossary-copay",
    "glossary-coinsurance", "glossary-out-of-pocket-max",
    "glossary-network", "glossary-formulary" — individual glossary cards

/find-doctors:
  - "doctor-search" — the search form (specialty / city / accepting filters)
  - "doctor-results" — the results list

/compare-plans:
  - "premium-filter" — filters: plan type, max premium, drug/dental/vision toggles

Examples:
- User on /learn asks "what's Part B?" → call highlight_section("part-b"), then say "Part B covers your doctor visits — see the highlighted box."
- User on / asks "where do I start?" → call highlight_section("steps"), then say "Right here — three steps, start with Learn."
- User on / asks about a deductible → call navigate_to("/learn"), then highlight_section("glossary-deductible"), then explain in one sentence.`;

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
