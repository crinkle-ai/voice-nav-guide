// Single source of truth for AI-navigable destinations.
// Section ids listed here MUST exist as id="..." in the DOM on the named page,
// or the AI's highlight_section call will silently no-op.

export type NavPage = "/" | "/learn" | "/find-doctors" | "/compare-plans";

export interface NavSection {
  id: string;
  label: string;
  whenToUse: string;
}

export interface NavPageEntry {
  page: NavPage;
  label: string;
  whenToUse: string;
  sections: NavSection[];
}

export const NAV_MAP: NavPageEntry[] = [
  {
    page: "/",
    label: "Home",
    whenToUse: "Starting point. Hero, ZIP entry, journey roadmap, demos.",
    sections: [
      { id: "journey-strip", label: "Your journey roadmap (Learn → Find Doctors → Compare Plans)", whenToUse: "User says 'I don't know where to start', 'where do I begin', 'walk me through this', or is overwhelmed by the whole process." },
      { id: "zip-entry", label: "ZIP code entry to see local plans", whenToUse: "User wants to jump straight to plans in their area." },
      { id: "hero", label: "Top of the page / overview", whenToUse: "User asks 'what is this site' or wants the top of Home." },
      { id: "demo", label: "Demo videos", whenToUse: "User wants to see how the product works." },
      { id: "plans", label: "Plan highlights", whenToUse: "User wants a quick peek at plan options on Home." },
      { id: "benefits", label: "Extra benefits", whenToUse: "User asks about dental, vision, hearing, OTC, fitness." },
      { id: "resources", label: "Educational resources", whenToUse: "User wants Medicare reading material on Home." },
      { id: "trust", label: "Trust / company info", whenToUse: "User asks 'who are you' or about credibility." },
    ],
  },
  {
    page: "/learn",
    label: "Learn",
    whenToUse: "Plain-language explanations of Medicare Parts A, B, C, D, Medigap, and glossary.",
    sections: [
      { id: "part-a", label: "Part A — Hospital", whenToUse: "User asks about hospital coverage." },
      { id: "part-b", label: "Part B — Medical", whenToUse: "User asks about doctor visits / outpatient." },
      { id: "part-c", label: "Part C — Medicare Advantage", whenToUse: "User asks about Advantage / MA / all-in-one plans." },
      { id: "part-d", label: "Part D — Prescription Drugs", whenToUse: "User asks about drug coverage." },
      { id: "medigap", label: "Medigap (Supplement)", whenToUse: "User asks about supplement plans." },
      { id: "glossary", label: "Glossary of terms", whenToUse: "User asks what a term means (premium, deductible, network…)." },
    ],
  },
  {
    page: "/find-doctors",
    label: "Find Doctors",
    whenToUse: "Search for in-network providers.",
    sections: [
      { id: "doctor-search", label: "Doctor search form", whenToUse: "User wants to look up a doctor or specialty." },
      { id: "doctor-results", label: "Doctor search results", whenToUse: "Show the matches that came back." },
    ],
  },
  {
    page: "/compare-plans",
    label: "Compare Plans",
    whenToUse: "Browse and compare Medicare plans.",
    sections: [
      { id: "premium-filter", label: "Plan filters (premium, drug, dental, vision)", whenToUse: "User wants to narrow plans by cost or benefit." },
      { id: "plan-results", label: "Plan results table", whenToUse: "Show the filtered plan list." },
      { id: "enroll-now", label: "Enroll / next steps CTA", whenToUse: "User is ready to enroll or take action." },
    ],
  },
];

/** Compact registry string to inject into the AI system prompt. */
export function buildNavMapPrompt(): string {
  const lines: string[] = [];
  for (const p of NAV_MAP) {
    lines.push(`- ${p.page} (${p.label}): ${p.whenToUse}`);
    for (const s of p.sections) {
      lines.push(`    • "${s.id}" — ${s.label}. Use when: ${s.whenToUse}`);
    }
  }
  return lines.join("\n");
}

/** Flat list of all valid section ids (for client-side validation/logging). */
export const ALL_SECTION_IDS: ReadonlySet<string> = new Set(
  NAV_MAP.flatMap((p) => p.sections.map((s) => s.id)),
);
