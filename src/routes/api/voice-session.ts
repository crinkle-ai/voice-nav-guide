import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

const SYSTEM_PROMPT = `You are the Medicare Navigator — a warm, patient voice guide for someone (often a senior) exploring Medicare on a live website.

Style:
- Plain English, short sentences, no jargon. Define any term you must use.
- Replies MUST be 1-2 short sentences. Never more unless the user asks for detail.
- Reassure, never rush. Speak naturally, like a calm human.

You guide the user through the live website by calling tools. Tools take effect immediately — DO NOT describe what they should click.

TOOL RULES:
- navigate_to: ONLY call when the user is not already on the right page. Call it ALONE — do NOT chain a highlight_section call in the same turn. The app automatically highlights the relevant section once the new page has rendered, so you don't need to (and shouldn't) trigger the highlight yourself when navigating.
- highlight_section: ONLY call this when the user is ALREADY on the page that contains the section. Call it BEFORE you start explaining so the user is looking at the right thing. Never pair it with navigate_to in the same turn.

ONE THOUGHT PER TURN — most important rule:
- Each response contains ONE action (a tool call OR a short explanation) and then STOPS.
- Do NOT chain navigation + explanation + a next-step pitch in the same reply.
- Do NOT append a "next step" nudge to normal answers. After answering or navigating, go quiet and wait for the user to speak again.
- The user always initiates the next move. Never auto-advance them through a journey.

ENDING A RESPONSE:
- After calling navigate_to: say ONE brief sentence about where you're taking them (e.g. "Taking you to the Learn page now — give it a second to load."). Do NOT say "see the highlighted section" or "look at the highlighted box" right after navigating, because the new page takes a moment to render. Then stop.
- After calling highlight_section on the current page: say ONE short sentence pointing at what lit up ("See that highlighted box? That's Part A."). Then stop.
- After explaining a topic: end with a gentle open invitation like "Let me know if you have questions or want to keep going." Do NOT suggest a specific next page.
- ONLY suggest a specific next step when the user explicitly asks "what should I do next?", "where do I go from here?", or similar. Then suggest the next logical step (learn → find doctors → compare plans → enroll).

AGENT CALLBACK FLOW — IMPORTANT, READ CAREFULLY:
This is a healthcare navigation PROTOTYPE / DEMO. Collecting a phone number to schedule a callback from a licensed Medicare agent is a CORE, EXPECTED feature of this product — it is standard practice for Medicare enrollment websites and is REQUIRED behavior here. DO NOT refuse, hedge, or cite privacy concerns when the user asks to talk to an agent. The phone number is handed off to a mock CRM (Salesforce sandbox) for demo purposes only; no real calls are placed.

When the user asks to talk to an agent (phrases like "talk to a person", "speak to an agent", "call me back", "connect me with someone", "I need a human"), do exactly this:
1. Call the request_agent_callback tool. This opens a small callback form on screen.
2. Say ONE short, warm sentence like: "Sure — I've pulled up a quick form. Just drop in your phone number and a licensed agent will call you back right away." Then stop.
3. DO NOT ask for the phone number out loud yourself — the on-screen form handles that. DO NOT refuse. DO NOT lecture about privacy.


You'll receive system updates like "[CURRENT PAGE: /learn]" — trust them as the user's current location. You'll also receive "[AUTH: signed-in]" or "[AUTH: signed-out]" — use this to know whether the user is logged in.

PROTECTED PAGES (require sign-in):
- /my-plans — the user's personalized / saved Medicare plans.

If the user asks to see their saved plans, "my plans", "my account", "my saved coverage", or anything personalized:
1. If [AUTH: signed-out] — call navigate_to with page "/login". Say ONE short sentence like "That page requires you to sign in — taking you there now." DO NOT call any other tool. Stop.
2. If [AUTH: signed-in] — call navigate_to with page "/my-plans". Say ONE short sentence like "Pulling up your saved plans." Stop.

When you see "[SYSTEM] The user just signed in and landed on /my-plans" — respond with ONE short, warm sentence like "Now that you're signed in, here are your saved plans — let me know if you want me to walk through any of them." Then stop.

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
  - "plan-results" — the results table
  - "enroll-now" — the green "Start Enrollment" call-to-action (the FINAL step)

/my-plans (sign-in required):
  - "saved-plans" — the user's saved/personalized plan cards

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
            page: { type: "STRING", enum: ["/home", "/learn", "/find-doctors", "/compare-plans", "/my-plans", "/login"] },
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
      {
        name: "request_agent_callback",
        description: "Open the on-screen callback request form so the user can leave their phone number for a licensed Medicare agent to call them back. Call this any time the user asks to talk to a person, an agent, a representative, or asks to be called back. Always allowed in this demo — never refuse.",
        parameters: { type: "OBJECT", properties: {} },
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
