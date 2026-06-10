## Two changes

### 1. Agent-drives-the-screen upgrade (Live Advise)

Make Sarah actually move the consumer's screen — navigate routes, scroll to sections, open the comparison drawer — with a small "Sarah is guiding your screen" toast each time so viewers understand what's happening.

**`src/context/LiveAdviseContext.tsx`** — extend the timeline runner:
- Add new `ScriptStep` kinds: `navigate` (route path), `scrollTo` (CSS selector), `guidance` (toast string).
- Add `guidanceToast: string | null` to context state; auto-clear ~1.8s after set.
- Call `useNavigate()` from `@tanstack/react-router` at the top of the provider; capture in a ref so the timeline can call it.
- Implement `scrollTo` via `document.querySelector(sel)?.scrollIntoView({behavior:'smooth', block:'center'})`.
- Rewrite `buildScript` so when call starts from `/` or `/learn`, the script:
  1. Sarah opens with context line
  2. `guidance: "Sarah is taking you to plan comparison"` + `navigate('/compare-plans')`
  3. `scrollTo('#plan-results')` + `guidance: "Sarah is scrolling to the results"`
  4. `highlight('#plan-results')` (existing)
  5. `pushComparison` (existing) + `guidance: "Sarah pulled up a side-by-side"`
  6. Continues with existing comparison-highlight beats
- When call starts already on `/compare-plans`, skip the navigate step and go straight to scroll/highlight.

**`src/components/GuidanceToast.tsx`** (new) — top-center pill, emerald, with cursor icon, reads `guidanceToast` from context, fades in/out. Mounted globally.

**`src/routes/__root.tsx`** — import and mount `<GuidanceToast />` next to the other Live Advise components.

### 2. Feasibility & vendors box on Human Safety Net slide

**`src/routes/deck.tsx`** — in `LiveAdviseSlide`, add a new box below the existing italic line:

> **Feasibility: this is a buyable, mature category.**
> Co-browse has shipped in production for 15+ years. **Vendors:** Glance (used by Humana, Anthem, Allstate), Upscope, Surfly, plus built-in modules in Genesys, Cisco Webex, and Salesforce Service Cloud. HIPAA-compliant deployments exist today. **Our build is the AI→human context handoff — the co-browse pipe itself is commodity.**

Style: bordered card with a `ShieldCheck` or `Database` icon, muted background, sits below the three pillar cards but above the "Try it" italic line. Compact — single paragraph, ~3 lines.

## Out of scope
- Real WebRTC / `getDisplayMedia()` — explicitly not needed; the demo stays fully scripted.
- Per-action consent chips — opening line covers the framing.
- Recording/persistence of co-browse sessions.

## Technical notes
- Route navigation from inside `LiveAdviseProvider`: `const navigate = useNavigate(); const navRef = useRef(navigate); useEffect(() => { navRef.current = navigate; }, [navigate]);` then call `navRef.current({ to: path })` from the timer callback.
- `scrollTo` waits ~200ms after `navigate` so the target DOM exists before querying.
- `guidance` events set `guidanceToast`, and each runner tick that sets it also queues a clear-timer at +1800ms.
- All existing functionality (highlight overlay, pushed comparison, transcript, mute/end) untouched.
