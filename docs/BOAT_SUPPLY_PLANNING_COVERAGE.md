# boAt Supply Planning Requirement Coverage

Audit date: 2026-08-10

| # | boAt requirement | Coverage | Natural product placement |
|---|---|---|---|
| 1 | PO management: Handover Date, adherence and exclusions | Covered | Procurement POs → HOD Adherence. Includes rolling adherence, HOD variance, exclusions and revision history. |
| 2 | ODM & EMS master: production/line capacity and lead times | Covered | Procurement POs → ODM/EMS Master. This keeps supplier-owned capacity beside sourcing execution while Capacity Planning retains plant RCCP. |
| 3 | Role-based interface: Production, Sourcing, S&OP and NPI | Covered for solution demonstration | Global planning header. Role persona selection persists locally and filters workbenches to each team’s responsibilities. Production Planner, Sourcing Manager, S&OP Lead and NPI Manager views are supported. Enterprise authentication and server-side authorization remain an integration concern. |
| 4 | RM & FG import planning and tracking | Covered | Network & Transfers → RM & FG Import Control Tower. Includes shipment/PO linkage, RM/FG type, origin, carrier, vessel/flight, BoL, ETA, customs status, in-transit units, lead-time buffer and duty/freight. |
| 5 | Rough-cut production planning using RM and capacity constraints | Covered | Capacity Planning → Rough-Cut Plan & Consensus Signoff. Feasible production is constrained by demand, live RM-buildable quantity and rated capacity. |
| 6 | Consensus production planning signoff and alignment | Covered | Capacity Planning → Rough-Cut Plan & Consensus Signoff. Draft, review, approval and lock states retain named actors, timestamps and history. |
| 7 | Continuous demand vs supply: short/medium term | Covered | Overview Cockpit → Demand vs Supply Comparison. Supports short W1–W4 and medium W5–W26 horizons, frozen/tactical zone semantics, demand-signal selection and product-family drill-down. |
| 8 | KPI tracking and dashboards | Covered | Overview Cockpit. Core service, shortage, capacity and inventory KPIs are complemented by PO adherence, supplier reliability, imports in transit and NPI readiness. |
| 9 | Medium and long-term capacity planning | Covered | Capacity Planning → 52-Week Gap Analysis. Short, medium and long horizon tiers and planned capacity/CapEx events are explicit. |
| 10 | Supplier/ODM lead-time and reliability scorecards | Covered | Procurement POs → ODM/EMS Master. Ranked scorecards combine 4/13/52-week OTD, actual vs quoted lead time, quality, rejection and composite reliability. |

## Placement rationale

- Import tracking is a sub-workbench of Network & Transfers because inbound international flow becomes network-available inventory after clearance; users do not have to learn another top-level tab.
- ODM/EMS master and supplier scorecards live with Procurement POs because Sourcing owns vendor terms, lead times and performance. Capacity Planning consumes the capacity outcome without duplicating vendor administration.
- Role selection lives in the shared application shell because role context affects every planning tab.
- Enterprise-wide demand/supply and KPI additions stay in the Overview Cockpit, where S&OP and functional leaders naturally begin their review.
