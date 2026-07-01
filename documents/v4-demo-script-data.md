# /v4 Demo Script — Providers, Medications & Plan Data

Reference cheat sheet for live demos of the Minneapolis **ZIP 55410** diabetic
scenario. Use the names below verbatim when you want the worksheet to verify
against NPPES / RxNorm and the matcher to recognize in-network providers and
on-formulary drugs.

> Shortcut: the **"Load diabetic 55410 demo"** button on `/v4` pre-fills a
> coherent profile (Dr. Bruley PCP + Dr. Schuster Endo, Lantus + Ozempic +
> metformin, $50/mo premium cap, $300 deductible cap, dental + vision extras).
> The lists below are what to say if you want to build the profile live.

---

## 1. Providers to mention (all verify against NPPES)

All 20 are seeded in `providers_55410` with real NPIs from the Twin Cities.
Say "Dr. <Last name>" — the extractor + NPI lookup will resolve the rest.

### Primary care (PCP) — in network on **every** plan
| Name | Specialty | Clinic | Address | NPI |
|---|---|---|---|---|
| Dr. Robert **Bruley** | Family Medicine | Park Nicollet | 2826 W 43rd St, Minneapolis 55410 | 1841403912 |
| Dr. Rachel **Agneberg** | Family Medicine | Park Nicollet | Park Nicollet, St Louis Park | 1831453786 |
| Dr. Stephanie **Aldrin** | Family Medicine | Park Nicollet | 1665 Utica Ave S, St Louis Park | 1144718917 |
| Dr. Sean **Anderson** | Family Medicine | Park Nicollet | Park Nicollet, St Louis Park | 1548247190 |
| Dr. Irvin **Goldenberg** | Internal Medicine | Park Nicollet | 3640 Zenith Ave S, Minneapolis 55410 | 1235241787 |
| Dr. Patti **Albright** | Internal Medicine | Park Nicollet | Park Nicollet, St Louis Park | 1467437368 |
| Dr. Alaa **Ali** | Internal Medicine | Park Nicollet | Park Nicollet, St Louis Park | 1366974933 |
| Dr. Deborah **Fletcher** | Internal Medicine | Park Nicollet | 5012 Queen Ave S, Minneapolis 55410 | 1699738898 |

### Endocrinology — Diabetes specialists (in network on all plans **except Patriot HMO**)
| Name | Clinic | Address | NPI |
|---|---|---|---|
| Dr. Lawrence **Schuster** | Park Nicollet | 4999 France Ave S, Minneapolis 55410 | 1861547382 |
| Dr. Richard **Bergenstal** | Park Nicollet (Intl. Diabetes Center) | Park Nicollet (Intl. Diabetes Center) | 1669459061 |
| Dr. Molly **Carlson** | Park Nicollet | Park Nicollet, St Louis Park | 1932149176 |
| Dr. Anders **Carlson** | Park Nicollet | 1665 Utica Ave S, St Louis Park | 1720254725 |

### Diabetes-related specialists
| Name | Specialty | In-network on | NPI |
|---|---|---|---|
| Dr. Andrew **Smith** | Cardiology | All 5 plans | 1699725101 |
| Dr. Joseph **Knapper** | Cardiology | All 5 plans | 1174889661 |
| Dr. Anthony **Woolley** | Nephrology | All except Patriot HMO | 1801873732 |
| Dr. Kyle **Abben** | Podiatry | PPOs + D-SNP | 1225321839 |
| Dr. John **Donohue** | Podiatry | PPOs + D-SNP | 1831163369 |
| Dr. Jane **Bailey** | Ophthalmology | PPOs only | 1740275841 |
| Dr. James **Layer** | Ophthalmology | PPOs only | 1811330939 |
| Dr. Madeline **Elmland** | Optometry | PPOs only | 1104491687 |

### Narrative hooks
- **"My eye doctor is Dr. Bailey"** → forces PPOs to the top; HMOs drop because Ophthalmology isn't in their network.
- **"My endocrinologist is Dr. Bergenstal"** → knocks **Patriot HMO** out of contention.
- **"My PCP is Dr. Bruley"** → in network everywhere; neutral signal.
- Mention a provider **not** in the list (e.g. "Dr. Smithers") → NPPES returns no high-confidence match, worksheet flags it as ambiguous.

---

## 2. Medications to mention (all verify against RxNorm)

| Drug to say | RxCUI | Route | Notes |
|---|---|---|---|
| **Lantus 100 unit/mL** (insulin glargine) | 261551 | injection | Long-acting insulin |
| **Ozempic 1 mg** pen (semaglutide) | 1991302 | injection | GLP-1; the differentiator drug |
| **metformin 500 mg** tablet | 860975 | tablet | Tier 1 everywhere; cheap baseline |

### Formulary matrix (what the matcher sees)

| Plan | Lantus | Ozempic | Metformin |
|---|---|---|---|
| **Choice HMO** ($0) | Tier 3 · PA · $47 pref | Tier 3 · **Step therapy** · $47 | Tier 1 · $0 |
| **Patriot HMO** ($0) | Tier 4 · PA · $95 pref | **Not covered** | Tier 1 · $0 |
| **Choice PPO** ($39) | Tier 2 · $15 pref | **Not covered** | Tier 1 · $0 |
| **Plan 2 PPO** ($89) | Tier 2 · $15 pref | Tier 3 · $47 · no step therapy | Tier 1 · $0 |
| **Dual Complete D-SNP** ($0) | Tier 2 · **$0** | Tier 3 · **$0** | Tier 1 · $0 |

### Narrative hooks
- **Add Ozempic** → Patriot HMO and Choice PPO drop sharply (drug not covered); **Plan 2 PPO** and **D-SNP** rise.
- **Add Lantus only** → Choice PPO and Plan 2 PPO win on copay; HMOs penalized for PA + higher tier.
- **Metformin alone** → no signal; every plan covers it at $0.

---

## 3. The 5 demo plans (what the matcher ranks)

| ID | Plan | Premium | Deductible | MOOP | Star | Extras | Notes |
|---|---|---|---|---|---|---|---|
| `uhc-choice-hmo` | AARP MA Choice Plan 1 (HMO) | $0 | $0 | $4,900 | ★ 4.0 | dental, vision, hearing, fitness | Focused Twin Cities network |
| `uhc-patriot-hmo` | AARP MA Patriot (HMO) | $0 | $250 | $6,700 | ★ 3.5 | dental, fitness | Broadest local network, lean formulary |
| `uhc-choice-ppo` | AARP MA Choice (PPO) | $39 | $0 | $6,700 | ★ 4.0 | dental, vision, hearing, fitness | Nationwide, any Medicare provider |
| `uhc-plan2-ppo` | AARP MA Plan 2 (PPO) | $89 | $0 | $4,500 | ★ 4.5 | dental, vision, hearing, fitness, transport, OTC | Richest extras, best MOOP |
| `uhc-dual-complete` | CHC Dual Complete MN-Y001 (D-SNP) | $0 | $0 | $0 | ★ 4.0 | dental, vision, hearing, transport, OTC, fitness | **Requires Medicaid** |

---

## 4. Demo profile to read aloud (recommended script)

> "I live in **55410**. I have **type 2 diabetes** and **high blood pressure**.
> My PCP is **Dr. Bruley at Park Nicollet**, and I see **Dr. Schuster at Park Nicollet** for endocrinology.
> I take **Lantus 100 units per mL injection**, **Ozempic 1 mg injection**, and **metformin 500 mg tablets**.
> I want to keep my premium under **$50 a month** and my deductible under
> **$300**. **Dental and vision** matter to me. I'm **not on Medicaid**."

Expected ranking after this script:
1. **AARP MA Plan 2 (PPO)** — covers Ozempic, $0 PCP, best extras + MOOP. Budget cap nudges score down but formulary + network win.
2. **AARP MA Choice (PPO)** — under budget, but Ozempic not covered → penalty.
3. **AARP MA Choice HMO** — Ozempic requires step therapy + PA.
4. **Patriot HMO** — Ozempic not covered, endo out of network.
5. **Dual Complete D-SNP** — would be #1, but requires Medicaid → 0.4× eligibility multiplier.

Then say **"Actually, I do have Medicaid"** → D-SNP jumps to #1.

---

## 5. Quick "what to test" matrix

| Goal | Say this |
|---|---|
| Verify NPPES wiring | "Dr. Bergenstal" (real NPI 1669459061) vs "Dr. Smithers" (no match) |
| Verify RxNorm wiring | "Ozempic 1 milligram" → resolves to RxCUI 1991302 |
| Trigger D-SNP path | "I have Medicare and Medicaid" |
| Trigger PPO recommendation | "I want to keep my eye doctor Dr. Bailey" |
| Trigger budget-cap penalty | "My premium ceiling is $25 a month" (knocks out $39 + $89 plans) |
| Trigger formulary penalty | Add **Ozempic** to a profile without Plan 2 PPO or D-SNP in lead |
