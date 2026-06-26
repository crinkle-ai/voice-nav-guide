import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const EXTRACTION_MODEL = "google/gemini-3.1-pro-preview";
import { EXTRACTION_SYSTEM } from "./prompts";
import { IntakeSchema, emptyIntake, type Intake } from "./intake-types";
import { z } from "zod";

const TranscriptMsg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const SCHEMA_HINT = `
Return ONLY a JSON object (no prose, no markdown fences) matching this exact shape:

{
  "reasonForCall":     { "value": string | null, "confidence": "captured" | "needs_confirmation" | "missing" },
  "priorities":        { "value": string[],     "confidence": "captured" | "needs_confirmation" | "missing" },
  "doctors":           { "value": Array<{ "name": string, "specialty": string|null, "city": string|null, "zip": string|null, "clinic": string|null, "verification": "high" | "low" | "unverified" }>, "confidence": "captured" | "needs_confirmation" | "missing" },
  "medications":       { "value": Array<{ "name": string, "strength": string|null, "doseForm": string|null, "frequency": string|null }>, "confidence": "captured" | "needs_confirmation" | "missing" },
  "conditions":        { "value": string[],     "confidence": "captured" | "needs_confirmation" | "missing" },
  "currentPlan":       { "value": string | null, "confidence": "captured" | "needs_confirmation" | "missing" },
  "budgetSensitivity": { "value": "low" | "medium" | "high" | null, "confidence": "captured" | "needs_confirmation" | "missing" },
  "zip":               { "value": string | null, "confidence": "captured" | "needs_confirmation" | "missing" },
  "extras":            { "value": ("dental" | "vision" | "hearing" | "fitness" | "transportation" | "otc")[], "confidence": "captured" | "needs_confirmation" | "missing" },
  "medicaid":          { "value": "yes" | "no" | "applying" | "unsure" | null, "confidence": "captured" | "needs_confirmation" | "missing", "notes": string | null },
  "budgetCaps":        { "monthlyPremiumMax": number | null, "annualDeductibleMax": number | null, "confidence": "captured" | "needs_confirmation" | "missing" }
}

Every field MUST be present. Use empty array [] for missing list fields and null for missing string fields.
For "medicaid": set value to "yes" if the caller is currently on Medicaid, "no" if they're not, "applying"
if they've applied or plan to apply, "unsure" if they don't know. Use "notes" for any short context they gave
(e.g. "spouse on Medicaid", "lost it last year"). Confidence "missing" only if Medicaid was never discussed.
`.trim();

function stripCodeFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function tryParseIntake(raw: string): Intake | null {
  const cleaned = stripCodeFences(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    const parsed = JSON.parse(slice);
    const result = IntakeSchema.safeParse(parsed);
    if (result.success) return result.data;
    console.warn("[extractIntake] schema mismatch:", result.error.issues.slice(0, 5));
    return null;
  } catch (e) {
    console.warn("[extractIntake] JSON parse failed:", e);
    return null;
  }
}

export const extractIntake = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ messages: z.array(TranscriptMsg) }).parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    if (data.messages.length === 0) return emptyIntake();

    const transcript = data.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { text } = await generateText({
        model: gateway(EXTRACTION_MODEL),
        system: `${EXTRACTION_SYSTEM}\n\n${SCHEMA_HINT}`,
        prompt: `Transcript of a Medicare intake call (USER = caller, ASSISTANT = AI):\n\n${transcript}\n\nReturn ONLY the JSON object. No prose. Only use what the USER said.`,
      });
      const parsed = tryParseIntake(text);
      if (parsed) return parsed;
      return emptyIntake();
    } catch (err) {
      console.error("extractIntake failed:", err);
      return emptyIntake();
    }
  });
