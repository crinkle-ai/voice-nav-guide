Make "Verify Doctors" actionable in two places: the workspace activity sends people to `/find-doctors` to add/save doctors, and `/compare-plans` shows per-plan in-network status for those saved doctors.

## 1. Workspace activity → Find Doctors

In `src/routes/workspace.activity.$activityId.tsx`, the `doctors` kind currently just lists `persona.doctors`. Add a primary CTA inside that block:

- "Find & verify a doctor" → `<Link to="/find-doctors">` (opens the existing search page where users can search by name/specialty/city and tap Save).
- Keep the existing list of already-added doctors below the CTA, with their current status badge.
- Secondary helper text: "Search for your doctor, save the ones you want to keep, and we'll check them against every plan you compare."

No change to the "Mark complete" button — saving at least one doctor + returning here still lets the user mark the step complete.

## 2. Per-plan network check on /compare-plans

In `src/routes/compare-plans.tsx`, add a new "Your doctors in these plans" sub-section that only renders when `state.savedDoctorIds.length > 0` AND there is at least one plan in either Top Matches or the comparison drawer.

For demo purposes (no real provider-network data exists yet in the mock plans), derive status deterministically:

- Look up the saved doctor objects via the existing `searchDoctors` server fn (already imported in `BottomVoiceBar`) — call it once with no filters and filter client-side by `state.savedDoctorIds`. Cache via `useQuery(["saved-doctors"])`.
- For each (plan, doctor) pair, compute a stable pseudo-status: `in-network` if `hash(plan.id + doctor.id) % 4 !== 0`, else `out-of-network`. This gives a believable mix for the demo without inventing data.
- Render as a compact matrix: rows = saved doctors, columns = the user's selected compare plans (fall back to top 3 `robertPlans` if none selected). Cells show a green check + "In-network" or amber X + "Out-of-network".
- Empty-state when no doctors saved: muted card with "Add doctors from Find Doctors to see network status here" + `<Link to="/find-doctors">`.

Place this section directly under the "Top matches for you" grid, before the agent banner.

## 3. Small nav nicety

Add a small "Verify another doctor" link beneath the new matrix → `/find-doctors`, so users can jump back and add more without going through the workspace.

## Files touched

- `src/routes/workspace.activity.$activityId.tsx` — add CTA in the `doctors` kind branch.
- `src/routes/compare-plans.tsx` — add doctor-network matrix section + empty state.
- (No new components needed; reuses `Link`, `Badge`, existing icons.)

## Out of scope

- Real provider network data / live formulary checks (mock plans don't carry network rosters).
- Updating the persona.doctors statuses in store — those remain narrative-only for now.
