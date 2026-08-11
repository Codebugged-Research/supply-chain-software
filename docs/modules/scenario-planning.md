# Scenario Planning Module — Architecture Inventory

> **Module nav id:** `scenario`
> **Status:** Partially built — interactive live scenario simulation functional; saved scenarios table is hardcoded mock data; no persistence
> **Source:** `app/page.js` → `ScenarioPage` component (lines ~2954–3093)
> **API endpoints:** `/api/data/kpis` (via `useSopData()`)
> **Last audited:** 2026-08-11

---

## 1. Purpose

Models what-if scenarios against the consensus plan at a quarterly revenue / gross margin level. Three interactive sliders (Demand Uplift, Input Cost Shift, Capacity Change) feed a live quarterly projection bar chart (Q1–Q4, showing baseline vs scenario vs gross margin). Also shows a hardcoded "Saved Scenarios" table with mock records.

---

## 2. Build Status

**Partially built.**

| Component | Status | Notes |
|---|---|---|
| 3× slider inputs | Functional | Demand Uplift (−20→+30%), Input Cost Shift (−10→+25%), Capacity Change (−15→+20%) |
| Scenario vs Baseline BarChart | Functional | Live computation from `kpis.totalRevenue` and `kpis.totalGm` split into quarterly baseline, then scaled by slider values |
| Saved Scenarios table | **Hardcoded mock** | 4 rows: Aggressive Growth Q4, Supplier Cost Spike, New Line Launch Q3, Recession Downside — all with hardcoded revenue/GM delta strings |
| "New Scenario" button | Stub | `<Button>` with no onClick handler |
| Cross-module scenario publish | **Not built** | No mechanism to publish a scenario to Supply Planning Studio or Demand Planning |

---

## 3. Data Entities Read

| Source | Fields used | Where |
|---|---|---|
| `/api/data/kpis` → `kpis{}` | `totalRevenue`, `totalGm` | Quarterly baseline computation — `quarterlyBaseline = totalRevenue / 2` (6-month data split to 1 quarter) |

**Writes:** None — all slider state is local React state, not persisted.

**Quarterly scenario formula:**
```
scenarios[q].baseline = quarterlyBaseline × (1 + q × 0.02)
requestedFactor       = 1 + demand[0]/100 + q×0.02
capacityFactor        = 1.2 × (1 + capacity[0]/100)
deliverableFactor     = min(requestedFactor, capacityFactor)
scenarios[q].scenario = baseline × deliverableFactor
scenarios[q].gm       = scenario − (baselineCOGS × (1 + cost[0]/100) × (1 + q×0.015) × deliverableFactor)
```
The shared `buildWhatIfScenarioComparison()` calculation now applies capacity as a deliverability constraint. Dashboard reuses this calculation for read-only named comparisons rather than implementing a second scenario engine.

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| Demand Uplift `Slider` | −20% to +30%, step 1% — scales quarterly scenario revenue |
| Input Cost Shift `Slider` | −10% to +25%, step 1% — scales quarterly gross margin |
| Capacity Change `Slider` | −15% to +20%, step 1% — constrains deliverable scenario revenue through the shared scenario calculation |
| `BarChart` (3-bar grouped, Recharts) | Q1–Q4: Baseline (grey) / Scenario (blue) / GM (green) — ₹M |
| Saved Scenarios `DataTable` | 4 hardcoded rows: name, owner, Revenue Δ, GM Δ, updated timestamp, status badge |
| "New Scenario" button | UI stub — no action |

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship |
|---|---|
| **Financial Planning** | Both have demand uplift and cost shift sliders for P&L what-if modeling. Financial Planning is finer-grained (weekly, 5 sliders, full P&L bridge, per-SKU profitability). Scenario Planning is coarser (quarterly, 3 sliders, revenue + GM only). These overlap in purpose and should eventually share a scenario state object — define a scenario, propagate its assumptions to Financial Planning for detail review before saving. |
| **Supply Planning → Scenario Studio** | The Supply Planning Studio (`/supply-planning/scenarios`) has a more complete scenario comparison view (6 metrics × 3 named scenarios side-by-side, publish to S&OP plan). This S&OP Suite Scenario Planning tab is a lighter-weight counterpart. The Supply Planning Studio is in a separate Next.js route with its own service layer; there is no data link between the two. |
| **Demand Planning** | The "Consensus Plan" locked by the Demand Consensus Workflow would be the input baseline for scenarios. Currently, the scenario baseline is `kpis.totalRevenue` (actual revenue), not a consensus forecast. |

---

## 6. BOAT Requirement Mapping & Gaps

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **S&OP Portal #4: What If Scenario comparison** | **Partially Covered** | Models quarterly demand, cost, and capacity scenarios against baseline. Dashboard reuses the same calculation for named review-meeting comparisons; scenario persistence remains missing. |
| **Supply Planning #6: Consensus Production Planning Signoff** | **Analytical Precursor** | Planners review scenarios before locking a plan, but no scenario publish mechanism exists to push to consensus signoff. |

---

## 7. Key Bugs / Issues

1. **Quarterly baseline is halved from 6-month data** — `quarterlyBaseline = kpis.totalRevenue / 2` is correct only if the underlying data covers exactly 6 months; if the dataset changes, the baseline denominator is not recalculated.
2. **Saved Scenarios are hardcoded** — No API for scenario CRUD. To be connected to a scenario persistence API when building the scenario save/load workflow.
