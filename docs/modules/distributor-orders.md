# Distributor Orders Module — Architecture Inventory

> **Module nav id:** `orders`
> **Status:** Functional — fully built with real API persistence; order freeze governance implemented
> **Source:** `app/page.js` → `OrdersPage` + `OrderEditDialog` components (lines ~1067–2083)
> **API endpoints:** `/api/orders/suggest`, `/api/orders/place` (POST), `/api/orders` (GET), `/api/orders/update` (PATCH), `/api/orders/rules`, `/api/orders/dealer-activation-gap`
> **Last audited:** 2026-08-10

---

## 1. Purpose

Distributor Order Portal — allows a distributor to place a suggested-quantity primary order (factory → distributor) with per-SKU editable quantities, scheme/promo visibility, a cashflow impact meter, and order freeze rules (Editable / Restricted / Locked based on the day of the month). Also shows a Dealer Activation Opportunity gap report (stocked vs active dealers per SKU).

---

## 2. Build Status

**Functional — the most fully implemented module in the S&OP Suite (excluding Supply Planning Studio).**

All write paths are real API calls persisted server-side (in-memory store on the backend). The order freeze governance workflow is fully functional:
- Day 1–25: Editable
- Day 26–28: Restricted (no single line may move > ±10%)
- Day 29–30: Locked (changes require "Request Approval" → mock governance workflow)

---

## 3. Data Entities Read and Written

### Read
| Endpoint | Data returned | Where used |
|---|---|---|
| `/api/orders/suggest?distributorId=X` | `suggestion{}` — `lines[]` (skuId, skuName, category, price, currentStock, weeklySecondary, suggestedQty, isHighDemand, scheme{}, effectivePrice, leadTimeDays), `tentativeDeliveryDate` | SKU Order Sheet table, KPI cards |
| `/api/orders?distributorId=X[&simDay=N]` | `orders[]` — `orderId`, `distributorId`, `distributorName`, `region`, `lines[]`, `totalQty`, `totalValue`, `cashflow`, `status`, `lockState{}`, `createdAt`, `lastUpdatedAt`, `pendingApproval{}` | Recent Orders table |
| `/api/orders/rules[?simDay=N]` | `lockState{}` — `state` (editable/restricted/locked), `label`, `day`, `hint`, `maxDeltaPct` | Lock badge in header + dialog |
| `/api/orders/dealer-activation-gap?distributorId=X` | `rows[]` — per-SKU: `skuId`, `skuName`, `category`, `stockedDealers`, `activeDealers`, `gapDealers`, `activationPct`, `potentialSecondaryValue`; `summary{}` | Dealer Activation Opportunity table |
| `/api/data/distributors` | `id`, `name`, `region`, `tier` | Distributor selector dropdown |

### Written (via API)
| Endpoint | Action | What changes |
|---|---|---|
| `POST /api/orders/place` | Places a new order | Creates new order record with status=Pending |
| `PATCH /api/orders/update` | `action=edit` | Amends quantities on an existing order; updates `lastUpdatedAt`, sets `status=Amended` |
| `PATCH /api/orders/update` | `action=request_approval` | Sets `status=Pending Approval`, creates `pendingApproval{}` record |
| `PATCH /api/orders/update` | `action=approve` | Applies pending quantities, updates status |
| `PATCH /api/orders/update` | `action=reject` | Rejects pending change, restores prior status |

---

## 4. Key UI Components / Widgets

| Widget | Description |
|---|---|
| Day simulator `<Select>` | "Demo day" override (Day 10/24/26/28/29/30) — changes the lock state for testing all three freeze windows |
| Distributor `<Select>` | Selects active distributor; reloads suggestion, orders, activation gap |
| `LockBadge` component | Inline badge showing Editable (green) / Restricted (amber) / Locked (red) |
| Dealer Activation Opportunity table | Stocked vs Active dealers per SKU, gap count, activation %, potential weekly secondary value impact |
| Order Cashflow Meter | Progress bar — Low / Moderate / High burn threshold (₹20.8L / ₹62.2L) |
| SKU Order Sheet table | Per-SKU: current stock, weekly secondary avg, suggested qty (clickable), scheme badge, `<Input>` order qty, line value |
| Place Order footer card | Total qty + value + ETA + "Place Order" button |
| Recent Orders table | Last 10 orders with lock state, cashflow, status, Edit/Review/Request button per row |
| `OrderEditDialog` | Dialog with per-line qty inputs, delta % violations highlighted, Save / Request Approval / Approve / Reject actions |

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship |
|---|---|
| **Demand Planning** | The `distributors[]` master is the same entity. The Demand Planning listing matrix uses distributor records as channel partners. The comment at line 487 of `app/page.js` confirms this is the design intent — one entity, two consumers. |
| **Order vs Dispatch** | Order vs Dispatch reads the saved orders placed here (`placed_orders` vs `suggested_pipeline` fallback) to compute the execution gap (ordered qty vs dispatched qty per SKU). Direct upstream dependency. |
| **Financial Planning** | Financial Planning's `channelByDistributor` and `segmentByDistributor` maps (`national` / `distributor` / `pilot` etc.) reference the same 5 distributor IDs (`DST-001` through `DST-005`). The cashflow projection in Financial Planning is downstream from the order values generated here. |
| **Supply Planning → Procurement POs** | The Supply Planning Procurement POs tab tracks HOD adherence and vendor POs (factory-side). Distributor Orders tracks the distributor-side primary order (factory → distributor). These are different PO types: the Supply Planning POs are ODM/EMS buy POs; these are the customer (distributor) sell orders. Not currently linked. |

---

## 6. BOAT Requirement Mapping & Gaps

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **S&OP Portal #2: Configurable cadence workflow** | **Partially Covered** | Implements a 30-day order freeze governance workflow (Editable Days 1–25, Restricted Days 26–28, Locked Days 29–30). |
| **Demand Planning #1: Channel Partner Data Integration** | **Non-overlapping** | Distributor Orders handles **primary order placement** (factory → distributor). It does NOT handle channel partner data integration (channel sell-through / inventory data feed into S&OP), which belongs to `Demand Planning`. |
| **Supply Planning #1: PO management tool** | **Partial (Customer POs)** | Handles primary distributor replenishment orders. Factory import/supplier PO management belongs to `Supply Planning Studio (Procurement POs)`. |

---

## 7. "Distributor Orders" vs "Channel Partner Data Integration" — Clarification

The `DEMAND_PLANNING.md` design specifies Channel Partner Data Integration as a Demand Planning sub-tab (Section 2.1). The current Distributor Orders tab does **not** overlap with that design — it covers a different flow:

- **Distributor Orders (this tab):** Distributor places a replenishment order (primary sell-in). Direction: boAt factory → distributor.
- **Channel Partner Data Integration (Demand Planning):** boAt pulls sell-through (tertiary) data, stock position, and DOS from channel partners into the planning engine. Direction: channel partner data feed → boAt S&OP system.

These are two distinct business processes. The naming similarity ("distributor" ≈ "channel partner") is a source of confusion in the codebase. The distributor records used here (`/api/data/distributors`) will eventually be unified with the `CHANNEL_PARTNER_MASTER` entity from the data model, but the workflow purposes are different.
