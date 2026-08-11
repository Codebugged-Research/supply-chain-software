# Chatbot Module — Architecture Inventory

> **Module nav id:** `chatbot`
> **Status:** Functional — fully built with real LLM integration (Groq Llama 3.1 8B), live data grounding, session management, and structured response cards
> **Scope classification:** **Out of original BOAT scope — confirm with stakeholder** (AI assistant capability, not explicitly listed in original BOAT RFP table)
> **Source:** `app/page.js` → `ChatbotPage` + `ChatCard` + `renderBotText` (lines ~3601–4148)
> **API endpoints:** `POST /api/chat/message`, `GET /api/chat/insights`, `GET /api/chat/suggestions`, `GET /api/chat/health`, `POST /api/chat/session/reset`
> **Last audited:** 2026-08-10

---

## 1. Purpose

S&OP AI Assistant — a 3-column natural-language planning assistant that answers questions about stock risk, distributor performance, scheme ROI, production planning, and what-if scenarios. Grounded in live S&OP dataset (15 SKUs, 5 distributors, 3 regions, 26 weeks). Powered by Groq Llama 3.1 8B with a rule-engine data layer that pre-processes insights and structured cards before the LLM call.

---

## 2. Build Status

**Functional — the second most complete module.** The AI pipeline is end-to-end:
1. Rule engine generates `insights[]` on every request (7 types: overstock, stockout, demand_exceeds_supply, demand_spike, demand_growth, scheme_roi, distributor_underperform)
2. User intent is classified from the message
3. Relevant insights are selected and injected into the LLM prompt as grounding context
4. Llama 3.1 8B (via Groq) generates a reply
5. Structured `cards[]` are appended to the response (risk_table, rank_table, rec_list types)
6. Session history is maintained (per `sessionId`)
7. Fallback: if Groq fails, a rule-based text response is generated without LLM

---

## 3. Data Entities Read

### Via `/api/chat/insights` (rule engine on live data)
The backend rule engine reads `/api/data/*` aggregates and generates structured insights:

| Insight type | What it detects | Severity |
|---|---|---|
| `overstock` | SKUs where stock > 2× weekly demand | medium/low |
| `stockout` | SKUs where stock < 0.5× weekly demand | high |
| `demand_exceeds_supply` | SKUs where demand > primary supply | high |
| `demand_spike` | WoW tertiary demand increase > 15% | medium |
| `demand_growth` | Half-vs-half actual demand growth > 10% | low |
| `scheme_roi` | High-value schemes with low secondary impact | medium |
| `distributor_underperform` | Distributors where secondary/primary ratio < 0.6 | medium |

### Via `POST /api/chat/message`
The message API receives `{ sessionId, message }` and:
- Reads session history
- Re-runs the rule engine to get fresh `insights[]`
- Classifies intent (stock_risk, distributor, production, scenario, general)
- Calls Groq LLM with grounded prompt
- Returns `{ reply, cards[], intent, insightsUsed[], sessionId, model, llmUsage, timestamp, llmError? }`

### Via `/api/chat/suggestions`
Returns categorized suggested questions based on detected insights. Example categories: Stock Risk, Production, Distributors.

### Via `/api/chat/health`
Returns `{ hasGroqKey: boolean, model: string }` — used to show the AI model badge and online/unavailable status.

**Writes:** Chat session history is maintained server-side (in-memory) per `sessionId`. `POST /api/chat/session/reset` clears the session.

---

## 4. Key UI Components / Widgets

**3-column layout:**

| Column | Contents |
|---|---|
| Left — Alerts + Suggestions | Exception alert cards (clickable → auto-fills chat with "Tell me more about X"); Suggested Questions grouped by category (clickable → sends question directly) |
| Center — Chat thread | User bubbles (right-aligned, blue) + Assistant bubbles (left-aligned, white + border) with `renderBotText` markdown rendering (bold/italic/inline code/bullets), structured `ChatCard` components below each assistant reply, "Analyzing data…" animated thinking indicator |
| Right — Context panel | "Data the Bot Sees" grid — Revenue, GM%, Total Demand, WoW%, SKU/Category/Distributor/Region/Weeks counts from live data |

**Structured card types (`ChatCard`):**
- `risk_table` / `rank_table` — table with severity badge cells
- `rec_list` — list with severity dots, title, detail, recommended action

**Chat input:**
- Free-text `<Input>` with form submit
- `<Button>` with gradient (violet→blue)
- "New Chat" button resets session

---

## 5. Overlap / Relationship with Other Modules

| Module | Relationship |
|---|---|
| **Dashboard** | Dashboard Alerts & Exceptions panel (4 hardcoded strings) should be replaced by the Chatbot's `/api/chat/insights` feed. The rule engine produces the same alerts the Dashboard panel should show — they are currently decoupled. |
| **Demand Planning** | `demand_spike` and `demand_growth` insight types detect the same WoW and half-vs-half signals that the Demand Planning tab calculates for its KPI cards. The Chatbot reads the same `weekly[]` source independently. |
| **Distributor Orders** | `distributor_underperform` and `scheme_roi` insights reference distributor and scheme data from the same dataset that Distributor Orders uses. The Chatbot can answer questions like "Which distributor has the worst activation?" before the user places an order. |
| **Supply Planning → Constraints & Risks** | The Constraints & Risks tab has its own exception matrix from `/api/v1/supply-planning?action=get_constraints`. The Chatbot's rule engine has a separate, independently computed insights set from `/api/data/*`. These are complementary but not linked — Supply Planning constraints are not included in the Chatbot context. |
| **Financial Planning** | The Chatbot has no specific financial intent type (budget, cashflow, margin). Financial questions would fall into the `general` intent and may receive low-quality responses. This is a gap if Finance team members are using the chatbot. |

---

## 6. BOAT Requirement Mapping & Scope Resolution

| BOAT Requirement | Coverage Status | Mapping / Implementation Notes |
|---|---|---|
| **BOAT RFP Scope Classification** | **Out of Original Scope** | Chatbot (AI Assistant) is **not in BOAT's original RFP list**. Retained as a powerful intelligence layer, but marked for stakeholder confirmation. |
| **S&OP Portal #5: Dashboards on various cuts for S&OP review** | **Supports via AI** | Answers ad-hoc queries across risk, performance, and scenario cuts using natural language. |
| **Supply Planning #8: KPIs tracking & Dashboards** | **Supports via AI** | Surfaces stock risk and demand exception insights dynamically. |

---

## 7. Key Technical Notes

- **Groq dependency:** If `GROQ_API_KEY` is not set, the `/api/chat/health` endpoint returns `{ hasGroqKey: false }` and the UI shows "unavailable". The rule-engine fallback still generates a text response (without LLM quality).
- **Session persistence:** In-memory only. Server restart clears all sessions. Production deployment would need Redis or database session storage.
- **LLM model:** Groq Llama 3.1 8B (fast inference, low cost). The `model` field in the health check reflects the actual model name returned by Groq.
- **Prompt grounding:** The LLM is given a structured system prompt with business context (boAt electronics, S&OP planning) + the top N most relevant insights from the rule engine. This prevents hallucination of specific numbers.
- **`llmError` transparency:** If the LLM call fails or returns a malformed response, the error is shown in an amber banner below the assistant reply — the rule-engine fallback text is still displayed.
