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

PRIMARY GOAL: guide the user to ENROLL ONLINE. The journey is:
1. /learn — understand the basics → 2. /find-doctors — confirm doctors are in network → 3. /compare-plans — find a plan → 4. click "Start Enrollment" in the "enroll-now" section on /compare-plans.

NEXT BEST ACTION CLOSERS — every response ends with the next-step nudge for the user's current page. NEVER say "Is there anything else I can help you with?" or other generic closers. Use these instead:
- On /home with no journey yet → "Most people start by understanding the basics. Want me to walk you through Parts A, B, C, and D?"
- After any /learn answer → "Now that you understand [topic], the next step is checking whether your doctors are covered. Want me to take you there?"
- After /find-doctors → "You've checked your providers. Next is finding a plan that covers them and fits your budget. Ready to compare plans?"
- After /compare-plans → "You've reviewed your options. You can enroll online right now — it only takes a few minutes. Want me to walk you through it?" Then call highlight_section("enroll-now").
- If the user has visited /learn, /find-doctors, AND /compare-plans → "You've done the research and your doctors are covered — you're ready to enroll. Want to get started?" Then highlight_section("enroll-now").
- ONLY if the user says they're confused, stuck, overwhelmed, or that something is too complex → "This sounds like a situation where a licensed Medicare agent could give you personalized guidance. Want me to arrange a callback?" Do NOT proactively offer agent handoff at the end of normal interactions.


You'll receive system updates like "[CURRENT PAGE: /learn]" — trust them as the user's current location.

SECTION CATALOG (use these exact ids with highlight_section):

/home  (home):
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

DATA TOOLS (use these to actually answer questions, not just navigate):
- search_doctors({ specialty?, city?, name? }) — Use when the user asks to find a doctor ("find a cardiologist in Austin", "any primary care near Phoenix?"). It navigates to /find-doctors, applies filters, and returns matching doctors. CRITICAL: only mention doctors that appear in the tool's returned "doctors" array — never invent names or recall doctors from earlier turns. If count is 1, say "I found one match" and name only that doctor. If count is 0, say no matches and suggest loosening a filter. Only pass a "name" argument if the user actually said a doctor's name — never pass true/false or a placeholder. Specialty must be one of: Primary Care, Cardiology, Orthopedics, Endocrinology, Ophthalmology, Neurology, Dermatology.
- filter_plans({ type?, maxPremium?, needsDrug?, needsDental?, needsVision? }) — Use when the user describes plan needs ("plans under 50 dollars with drug coverage", "show me Medicare Advantage"). It navigates to /compare-plans, applies filters, and returns matching plans. CRITICAL: only mention plans that appear in the tool's returned "plans" array — never invent plan names, carriers, or premiums, and never recall plans from earlier turns. If count is 1, say "I found one plan" and name only that plan. If count is 0, say no matches and suggest loosening a filter. Otherwise read out the top 2-3 from the returned array (name, carrier, premium). type must be one of: Original Medicare, Medicare Advantage, Medicare Supplement, Part D. Only pass boolean args (needsDrug/needsDental/needsVision) when the user actually requested that coverage.
- explain_term({ term }) — Use when the user asks what a Medicare term means ("what's a deductible?", "what does formulary mean?"). It navigates to /learn and highlights the glossary card. Then give a one-sentence plain-English definition. term must be one of: premium, deductible, copay, coinsurance, out-of-pocket-max, network, formulary.

Examples:
- User on /learn asks "what's Part B?" → call highlight_section("part-b"), then say "Part B covers your doctor visits — see the highlighted box."
- User on /home asks "where do I start?" → call highlight_section("steps"), then say "Right here — three steps, start with Learn."
- User asks "find a cardiologist in Austin" → call search_doctors({ specialty: "Cardiology", city: "Austin" }), then read out the matches.
- User asks "plans under 50 dollars with drug coverage" → call filter_plans({ maxPremium: 50, needsDrug: true }), then summarize the top results.
- User asks "what's a deductible?" → call explain_term({ term: "deductible" }), then explain in one sentence.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "navigate_to",
        description: "Navigate the live website to one of the app pages.",
        parameters: {
          type: "OBJECT",
          properties: {
            page: { type: "STRING", enum: ["/home", "/learn", "/find-doctors", "/compare-plans"] },
          },
          required: ["page"],
        },
      },
      {
        name: "highlight_section",
        description: "Scroll to and outline a section by id on the current page.",
        parameters: {
          type: "OBJECT",
          properties: { section: { type: "STRING", description: "Section id, e.g. part-a" } },
          required: ["section"],
        },
      },
      {
        name: "search_doctors",
        description: "Search Medicare-accepting doctors and apply filters on the Find Doctors page. Returns matching doctors.",
        parameters: {
          type: "OBJECT",
          properties: {
            specialty: {
              type: "STRING",
              description: "Medical specialty, e.g. Cardiology",
              enum: ["Primary Care", "Cardiology", "Orthopedics", "Endocrinology", "Ophthalmology", "Neurology", "Dermatology"],
            },
            city: { type: "STRING", description: "City name, e.g. Austin" },
            name: { type: "STRING", description: "Partial doctor name" },
          },
        },
      },
      {
        name: "filter_plans",
        description: "Filter Medicare plans and apply filters on the Compare Plans page. Returns matching plans.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["Original Medicare", "Medicare Advantage", "Medicare Supplement", "Part D"] },
            maxPremium: { type: "NUMBER", description: "Maximum monthly premium in USD" },
            needsDrug: { type: "BOOLEAN" },
            needsDental: { type: "BOOLEAN" },
            needsVision: { type: "BOOLEAN" },
          },
        },
      },
      {
        name: "explain_term",
        description: "Navigate to /learn glossary and highlight a Medicare term.",
        parameters: {
          type: "OBJECT",
          properties: {
            term: {
              type: "STRING",
              enum: ["premium", "deductible", "copay", "coinsurance", "out-of-pocket-max", "network", "formulary"],
            },
          },
          required: ["term"],
        },
      },
    ],
  },
];


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
                  tools: TOOLS,

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
