import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/v4/deck")({
  head: () => ({
    meta: [
      { title: "AI Self-Serve Shopping Pilot — Leadership Deck" },
      {
        name: "description",
        content:
          "A sandbox pilot exploring whether one AI guide can take a Medicare shopper from 'I'm overwhelmed' to a ranked plan list and a warm handoff to a licensed agent.",
      },
      { property: "og:title", content: "AI Self-Serve Shopping Pilot — Leadership Deck" },
      {
        property: "og:description",
        content:
          "Turning the shopping maze into a guided path. A sandbox pilot of the /v4 consumer experience.",
      },
    ],
  }),
  component: Deck,
});

// CH palette
const UHC_DARK_BLUE = "#002677";
const UHC_MEDIUM_BLUE = "#196ECF";
const UHC_DARK_GREY = "#333333";
const UHC_MUTED_GREY = "#555555";
const UHC_BG = "#FFFFFF";
const RULE = "rgba(0, 38, 119, 0.15)";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Calibri, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Consolas, 'SF Mono', Menlo, monospace";

type SlideProps = {
  idx: number;
  total: number;
  section: string;
  children: React.ReactNode;
};

function Slide({ idx, total, section, children }: SlideProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-[1280px]"
      style={{
        aspectRatio: "16 / 9",
        background: UHC_BG,
        color: UHC_DARK_GREY,
        fontFamily: SANS,
        boxShadow: "0 20px 60px -20px rgba(0, 38, 119, 0.18)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-10"
        style={{ top: 22, fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: UHC_MUTED_GREY }}
      >
        <span>AI SELF-SERVE SHOPPING PILOT</span>
        <span>{section}</span>
        <span>
          {String(idx).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div className="absolute left-10 right-10" style={{ top: 48, height: 1, background: RULE }} />
      <div
        className="absolute left-10 right-10 flex items-center justify-between"
        style={{ bottom: 22, fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: UHC_MUTED_GREY }}
      >
        <span>SANDBOX / V4 EXPERIENCE / INTERNAL</span>
        <span>LEADERSHIP UPDATE — 2026</span>
      </div>

      <div className="absolute inset-0 px-14 pt-20 pb-14">{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", color: UHC_MUTED_GREY, marginBottom: 18 }}>
      {children}
    </div>
  );
}

function H1({ children, size = 64 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2
      style={{
        fontFamily: SERIF,
        fontSize: size,
        lineHeight: 1.05,
        fontWeight: 400,
        color: UHC_DARK_BLUE,
        letterSpacing: "-0.01em",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: UHC_MUTED_GREY, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

const TOTAL = 8;

/* 01 · Executive Summary */
function Slide01() {
  return (
    <Slide idx={1} total={TOTAL} section="01 · EXECUTIVE SUMMARY">
      <Eyebrow>INDEX · 2026.Q2</Eyebrow>
      <H1 size={92}>
        Turning the shopping maze
        <br />
        <span style={{ color: UHC_MEDIUM_BLUE }}>into a guided path.</span>
      </H1>
      <p style={{ marginTop: 28, fontSize: 20, lineHeight: 1.5, maxWidth: 880, color: UHC_DARK_GREY }}>
        Testing whether one AI guide can take a Medicare shopper from "I'm overwhelmed" to a
        ranked, verified plan list — and to a licensed agent already holding their context.
      </p>
      <div className="absolute" style={{ left: 56, right: 56, bottom: 70, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
        {[
          ["STATUS", "Prototype live at /v4"],
          ["SURFACE", "Consumer web · AI chat"],
          ["SAMPLE", "~30–40 internal participants"],
          ["APPROACH", "Phased, sequential testing"],
        ].map(([k, v]) => (
          <div key={k}>
            <Label>{k}</Label>
            <div style={{ marginTop: 8, fontSize: 15, color: UHC_DARK_BLUE }}>{v}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

/* 02 · The Problem */
function Slide02() {
  const rows: [string, string][] = [
    ["Shoppers face plan grids, jargon, and forms before they get any guidance.", "AI starts with a conversation: 'What matters to you?' Plans come later."],
    ["Doctor and drug lookups happen in separate tools and rarely line up.", "Providers verified live against NPPES; meds against RxNorm — inside the chat."],
    ["By the time a shopper calls, they've repeated the basics three times.", "The agent picks up the shopper's full profile, priorities, and favorites."],
    ["Most shoppers never compare plans during open enrollment.", "A ranked short-list is produced in minutes, with reasons they can read."],
  ];
  return (
    <Slide idx={2} total={TOTAL} section="02 · THE PROBLEM">
      <Eyebrow>THE FRICTION</Eyebrow>
      <H1 size={52}>
        Can AI replace <span style={{ color: UHC_MEDIUM_BLUE }}>the maze?</span>
        <br />
        <span style={{ fontSize: 28, color: UHC_DARK_GREY, fontWeight: 400 }}>
          Today, too much of shopping is spent navigating tools instead of getting advice.
        </span>
      </H1>
      <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <Label>NOW</Label>
          <ol style={{ marginTop: 16, padding: 0, listStyle: "none" }}>
            {rows.map(([n], i) => (
              <li key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i === 0 ? `1px solid ${RULE}` : "none", borderBottom: `1px solid ${RULE}`, fontSize: 16 }}>
                <span style={{ fontFamily: MONO, color: UHC_MEDIUM_BLUE, width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <Label>NEXT</Label>
          <ol style={{ marginTop: 16, padding: 0, listStyle: "none" }}>
            {rows.map(([, x], i) => (
              <li key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i === 0 ? `1px solid ${RULE}` : "none", borderBottom: `1px solid ${RULE}`, fontSize: 16 }}>
                <span style={{ fontFamily: MONO, color: UHC_MEDIUM_BLUE, width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{x}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Slide>
  );
}

/* 03 · Objective & Hypothesis */
function Slide03() {
  const qs: [string, string][] = [
    ["Q1", "Do shoppers feel guided, or feel sold to?"],
    ["Q2", "Does the AI produce a ranked short-list shoppers actually believe?"],
    ["Q3", "Can it ground-truth real doctors and real medications mid-chat?"],
    ["Q4", "When the shopper wants a human, is the handoff genuinely warm?"],
  ];
  return (
    <Slide idx={3} total={TOTAL} section="03 · OBJECTIVE & HYPOTHESIS">
      <Eyebrow>OBJECTIVE</Eyebrow>
      <H1 size={52}>
        Take a shopper from overwhelmed to short-list —
        <br />
        <span style={{ color: UHC_MEDIUM_BLUE }}>and hand the agent a buyer, not a stranger.</span>
      </H1>
      <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56 }}>
        <div>
          <Label>HYPOTHESIS</Label>
          <p style={{ marginTop: 14, fontSize: 18, lineHeight: 1.55, color: UHC_DARK_GREY }}>
            One guided AI experience can capture priorities, doctors, and meds in a single
            conversation, return a ranked short-list with reasons, and hand a licensed agent a
            shopper who already knows what they want — and why.
          </p>
        </div>
        <div>
          <Label>WHAT WE'LL LEARN</Label>
          <ul style={{ marginTop: 14, padding: 0, listStyle: "none" }}>
            {qs.map(([q, t]) => (
              <li key={q} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${RULE}`, fontSize: 15 }}>
                <span style={{ fontFamily: MONO, color: UHC_MEDIUM_BLUE, width: 28 }}>{q}</span>
                <span style={{ color: UHC_DARK_GREY }}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Slide>
  );
}

/* 04 · The Job */
function Slide04() {
  const cols: [string, string, string][] = [
    ["01", "Listen", "Open conversation — what matters, who you see, what you take."],
    ["02", "Verify", "Resolve doctors against NPPES and meds against RxNorm in real time."],
    ["03", "Rank", "Score the catalog on network, formulary, budget, and extras fit."],
    ["04", "Hand off", "Live agent call with the full workspace already in hand."],
  ];
  return (
    <Slide idx={4} total={TOTAL} section="04 · THE JOB">
      <Eyebrow>WHAT THE V4 GUIDE IS HERE TO DO</Eyebrow>
      <H1 size={56}>
        Listen. Verify. Rank. <span style={{ color: UHC_MEDIUM_BLUE }}>Hand off.</span>
      </H1>
      <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.55, maxWidth: 980, color: UHC_MUTED_GREY, fontStyle: "italic" }}>
        “Help the shopper say what matters, ground-truth their doctors and medications, return
        a ranked short-list they can defend, and put a licensed agent on the call already
        holding the workspace.”
      </p>
      <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
        {cols.map(([n, t, d]) => (
          <div key={n} style={{ borderTop: `2px solid ${UHC_MEDIUM_BLUE}`, paddingTop: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: UHC_MEDIUM_BLUE, letterSpacing: "0.12em" }}>{n}</div>
            <div style={{ fontFamily: SERIF, fontSize: 26, marginTop: 6 }}>{t}</div>
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: UHC_MUTED_GREY }}>{d}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

/* 05 · Workspace Schema (Structured Output) */
function Slide05() {
  const fields: [string, string, string][] = [
    ["01", "About You", "ZIP · age band · Medicaid status · enrollment timing."],
    ["02", "Priorities", "Top trade-offs: cost, network, drug coverage, extras."],
    ["03", "Doctors", "Name · specialty · clinic · NPI-verified."],
    ["04", "Medications", "Name · strength · form · frequency · RxNorm-verified."],
    ["05", "Budget", "Monthly premium cap · deductible cap · extras wanted."],
    ["06", "Favorites", "Plans the shopper hearted, with the reasons they were ranked."],
  ];
  return (
    <Slide idx={5} total={TOTAL} section="05 · HANDOFF SCHEMA">
      <Eyebrow>STRUCTURED WORKSPACE THE AGENT RECEIVES</Eyebrow>
      <H1 size={48}>What the licensed agent picks up.</H1>
      <p style={{ marginTop: 14, fontSize: 14, color: UHC_MUTED_GREY, maxWidth: 900 }}>
        Aligned with CMS marketing rules and HIPAA minimum-necessary — only the fields that
        materially change the conversation that follows.
      </p>
      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {fields.map(([n, t, d]) => (
          <div key={n} style={{ padding: 18, border: `1px solid ${RULE}`, borderRadius: 4 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: UHC_MEDIUM_BLUE, letterSpacing: "0.12em" }}>{n}</div>
            <div style={{ marginTop: 6, fontFamily: SERIF, fontSize: 22, color: UHC_DARK_BLUE }}>{t}</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: UHC_MUTED_GREY }}>{d}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

/* 06 · Pilot Design */
function Slide06() {
  const rounds: [string, string, string][] = [
    ["R0", "Dry Run", "Calibrate prompts, verification latency, and the workspace format with a small internal group."],
    ["R1", "Shopper Focused", "Is the guided chat desirable, and do shoppers stay engaged through verification?"],
    ["R2", "Short-list", "Do shoppers trust the ranked plans and the reasons? Do they favorite any?"],
    ["R3", "Handoff", "When the shopper hits 'Get a 2nd Opinion,' does the agent open the call already knowing them?"],
  ];
  return (
    <Slide idx={6} total={TOTAL} section="06 · PILOT DESIGN">
      <Eyebrow>FOUR ROUNDS · ONE EXPERIENCE · MEASUREMENT-FIRST</Eyebrow>
      <H1 size={48}>
        30–40 participants, four rounds —
        <br />
        <span style={{ color: UHC_MEDIUM_BLUE }}>each round answers one measurable question.</span>
      </H1>
      <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
        {rounds.map(([r, t, d]) => (
          <div key={r} style={{ padding: 18, background: UHC_BG, borderTop: `3px solid ${UHC_MEDIUM_BLUE}` }}>
            <div style={{ fontFamily: MONO, fontSize: 12, color: UHC_MEDIUM_BLUE, letterSpacing: "0.14em" }}>{r}</div>
            <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 22, color: UHC_DARK_BLUE, lineHeight: 1.15 }}>{t}</div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: UHC_MUTED_GREY }}>{d}</div>
          </div>
        ))}
      </div>
      <div className="absolute" style={{ left: 56, right: 56, bottom: 68 }}>
        <Label>WHY THIS SHAPE</Label>
        <p style={{ marginTop: 6, fontSize: 13, color: UHC_MUTED_GREY }}>
          Sequential rounds let each round answer one measurable question cleanly, and let
          learnings from one round sharpen the prompts and ranking for the next.
        </p>
      </div>
    </Slide>
  );
}

/* 07 · What Success Looks Like */
function Slide07() {
  const success: [string, string][] = [
    ["Shopper experience", "Shoppers describe the guide as helpful and stay engaged through verification."],
    ["Trust in the short-list", "Most shoppers rate the ranking 4 out of 5 or higher and favorite at least one plan."],
    ["Verification fidelity", "Doctors and meds resolve correctly on first or second try in most sessions."],
    ["Warm handoff", "Licensed agents open the call without re-asking captured fields."],
    ["Graceful failure", "When the AI gets stuck, it offers the agent button cleanly — it doesn't loop."],
  ];
  const shopperQs = [
    "Did it feel like the guide was helping, or selling?",
    "Was there a moment you wanted a human instead? When?",
    "Would you rather shop this way, or the way you do today?",
  ];
  const agentQs = [
    "Rate the workspace 1–5. What was missing or wrong?",
    "Did you have to re-ask anything the guide should have captured?",
    "Did the favorites change how you opened the call?",
  ];
  return (
    <Slide idx={7} total={TOTAL} section="07 · WHAT SUCCESS LOOKS LIKE">
      <Eyebrow>HOW WE'LL JUDGE THE PILOT</Eyebrow>
      <H1 size={48}>
        Five signals of success — <span style={{ color: UHC_MEDIUM_BLUE }}>and the questions behind them.</span>
      </H1>
      <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 32 }}>
        <div>
          <Label>SUCCESS LOOKS LIKE</Label>
          <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
            {success.map(([t, d], i) => (
              <li key={i} style={{ padding: "12px 0", borderTop: i === 0 ? `1px solid ${RULE}` : "none", borderBottom: `1px solid ${RULE}` }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontFamily: MONO, color: UHC_MEDIUM_BLUE, fontSize: 11, width: 24 }}>/ {String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 16, color: UHC_DARK_BLUE }}>{t}</div>
                    <div style={{ marginTop: 2, fontSize: 13, color: UHC_MUTED_GREY, lineHeight: 1.45 }}>{d}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label>WE'LL ASK SHOPPERS</Label>
          <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
            {shopperQs.map((q, i) => (
              <li key={i} style={{ padding: "12px 0", borderTop: i === 0 ? `1px solid ${RULE}` : "none", borderBottom: `1px solid ${RULE}`, fontSize: 13, color: UHC_DARK_BLUE, lineHeight: 1.5, fontStyle: "italic" }}>
                "{q}"
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label>WE'LL ASK AGENTS</Label>
          <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
            {agentQs.map((q, i) => (
              <li key={i} style={{ padding: "12px 0", borderTop: i === 0 ? `1px solid ${RULE}` : "none", borderBottom: `1px solid ${RULE}`, fontSize: 13, color: UHC_DARK_BLUE, lineHeight: 1.5, fontStyle: "italic" }}>
                "{q}"
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Slide>
  );
}

/* 08 · Next Steps */
function Slide08() {
  const next: [string, string, string][] = [
    ["01", "Dry runs", "Prompt refinement, verification timing, and workspace format calibrated with a small internal group."],
    ["02", "Internal pilot", "Run the four rounds with 30–40 participants end-to-end at /v4."],
    ["03", "Synthesize", "Shopper, agent, and ops feedback consolidated in one review."],
    ["04", "Decide", "Refine, expand scope, or pause — based on the five success signals."],
  ];
  return (
    <Slide idx={8} total={TOTAL} section="08 · NEXT STEPS">
      <Eyebrow>WHAT COMES AFTER KICKOFF</Eyebrow>
      <H1 size={52}>
        From kickoff to a clear decision:
        <br />
        <span style={{ color: UHC_MEDIUM_BLUE }}>go, refine, or pause.</span>
      </H1>
      <p style={{ marginTop: 18, fontSize: 16, lineHeight: 1.55, maxWidth: 900, color: UHC_MUTED_GREY }}>
        Four sequential steps. Each one ends with something concrete the team can react to — a
        calibrated prototype, a completed round of sessions, a synthesized read, and a decision.
      </p>
      <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
        {next.map(([n, t, d]) => (
          <div key={n} style={{ borderTop: `2px solid ${UHC_MEDIUM_BLUE}`, paddingTop: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: UHC_MEDIUM_BLUE, letterSpacing: "0.12em" }}>{n}</div>
            <div style={{ fontFamily: SERIF, fontSize: 24, marginTop: 6, color: UHC_DARK_BLUE }}>{t}</div>
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: UHC_MUTED_GREY }}>{d}</div>
          </div>
        ))}
      </div>
    </Slide>
  );
}

function Deck() {
  const slides = [Slide01, Slide02, Slide03, Slide04, Slide05, Slide06, Slide07, Slide08];
  return (
    <div style={{ background: UHC_BG, minHeight: "100vh", fontFamily: SANS, color: UHC_DARK_GREY }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: UHC_DARK_BLUE, color: UHC_BG, borderBottom: `1px solid ${RULE}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", color: UHC_BG }}>
            AI SELF-SERVE SHOPPING PILOT · LEADERSHIP DECK
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Link
              to="/v4/intake"
              style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: UHC_BG, textDecoration: "none" }}
            >
              TRY THE EXPERIENCE →
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", color: UHC_MUTED_GREY }}>
            INDEX · 2026.Q2 · 8 SLIDES
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 1.05, margin: "12px 0 0", fontWeight: 400 }}>
            Turning the shopping maze <span style={{ color: UHC_MEDIUM_BLUE }}>into a guided path.</span>
          </h1>
          <p style={{ marginTop: 14, fontSize: 17, color: UHC_DARK_GREY, maxWidth: 760 }}>
            A sandbox pilot of the /v4 consumer experience — testing whether one AI guide can take a
            Medicare shopper from "I'm overwhelmed" to a ranked, verified short-list and a warm
            handoff to a licensed agent.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {slides.map((S, i) => (
            <div key={i} id={`slide-${i + 1}`}>
              <S />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
