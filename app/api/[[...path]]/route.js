import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  getDataset,
  filterWeekly,
  aggregate,
  kpis,
  suggestOrders,
  buildDispatchVisibilityRows,
  buildDealerActivationGap,
  REGIONS,
  DISTRIBUTORS,
  SKUS,
} from '@/lib/dummyData'
import { getOrdersCollection } from '@/lib/mongodb'
import {
  fmtInrMoney,
  fmtInrInteger,
  CASHFLOW_ORDER_LOW_INR,
  CASHFLOW_ORDER_HIGH_INR,
} from '@/lib/utils'

function q(request) {
  const url = new URL(request.url)
  return Object.fromEntries(url.searchParams.entries())
}

// -----------------------------------------------------------------------
// Order Freeze Logic
// -----------------------------------------------------------------------
//   • day < 25  → "editable"   (fully editable)
//   • 25 ≤ day ≤ 28 → "restricted" (max ±10% per-line qty change)
//   • day ≥ 29  → "locked"     (no edits — approval workflow required)
// -----------------------------------------------------------------------
function computeLockState(simDay) {
  const raw = simDay !== undefined && simDay !== null && simDay !== ''
    ? Math.max(1, Math.min(31, Math.floor(Number(simDay))))
    : new Date().getUTCDate()
  if (raw < 25) return { state: 'editable', label: 'Editable', day: raw, maxDeltaPct: null,
    hint: `Day ${raw} of month · fully editable until the 25th` }
  if (raw <= 28) return { state: 'restricted', label: 'Restricted', day: raw, maxDeltaPct: 10,
    hint: `Day ${raw} of month · edits limited to ±10% per line until the 28th` }
  return { state: 'locked', label: 'Locked', day: raw, maxDeltaPct: 0,
    hint: `Day ${raw} of month · order book frozen · approval required to amend` }
}

// Rebuild enriched lines (with scheme pricing) from raw {skuId, qty} inputs.
// Used by both POST /orders/place and PATCH /orders/update so behaviour is identical.
function enrichLines(distributorId, inputLines) {
  const suggestion = suggestOrders(distributorId)
  const lineMap = Object.fromEntries(suggestion.lines.map((l) => [l.skuId, l]))
  const enriched = []
  let totalQty = 0
  let totalValue = 0
  for (const ln of inputLines || []) {
    const ref = lineMap[ln.skuId]
    if (!ref) continue
    const qn = Math.max(0, Math.round(Number(ln.qty) || 0))
    if (qn <= 0) continue
    const discount = ref.scheme?.discountPct || 0
    const effectivePrice = Math.round(ref.price * (1 - discount / 100) * 100) / 100
    const lineValue = Math.round(qn * effectivePrice * 100) / 100
    totalQty += qn
    totalValue += lineValue
    enriched.push({
      skuId: ln.skuId,
      skuName: ref.skuName,
      category: ref.category,
      qty: qn,
      unitPrice: ref.price,
      effectivePrice,
      lineValue,
      scheme: ref.scheme?.label || null,
      discountPct: discount,
    })
  }
  totalValue = Math.round(totalValue * 100) / 100
  const cashflow = totalValue >= CASHFLOW_ORDER_HIGH_INR ? 'high' : totalValue >= CASHFLOW_ORDER_LOW_INR ? 'medium' : 'low'
  return { lines: enriched, totalQty, totalValue, cashflow }
}

// =======================================================================
// CHATBOT — S&OP Insights AI
// -----------------------------------------------------------------------
// Three-layer architecture:
//   1. Rule-based insight engine → deterministic exception alerts from
//      the dataset (overstock, stockout, demand>supply, demand spikes,
//      scheme ROI, distributor rank).
//   2. Groq Llama 3.1-8B-Instant → natural language executive-style
//      responses grounded in the data context we pass in.
//   3. Structured cards → server-built from the same rule engine so
//      the UI can render tables/lists alongside the prose.
// =======================================================================

// In-memory chat session store (per-server-instance).
const chatSessions = new Map()

function getOrCreateSession(sessionId) {
  let sid = sessionId
  if (!sid || !chatSessions.has(sid)) {
    sid = sessionId || ('CHT-' + uuidv4().slice(0, 8).toUpperCase())
    if (!chatSessions.has(sid)) {
      chatSessions.set(sid, { sessionId: sid, messages: [], createdAt: new Date().toISOString() })
    }
  }
  return chatSessions.get(sid)
}

// -----------------------------------------------------------------------
// Compute S&OP rule-based insights from the live dataset
// -----------------------------------------------------------------------
let _insightsCache = null
let _insightsCacheAt = 0
function buildInsights() {
  // Cache for 60s so chat requests don't recompute every time
  if (_insightsCache && Date.now() - _insightsCacheAt < 60_000) return _insightsCache

  const ds = getDataset()
  const weekly = ds.weekly || []
  const skus = ds.skus || []
  const weeks = ds.weeks || []
  if (!weekly.length || !weeks.length) return []

  const lastWeekId = weeks[weeks.length - 1].weekId
  const last4Ids = weeks.slice(-4).map((w) => w.weekId)
  const prev4Ids = weeks.slice(-8, -4).map((w) => w.weekId)

  const insights = []
  let id = 0

  for (const sku of skus) {
    const skuRows = weekly.filter((r) => r.skuId === sku.id)
    const latestRows = skuRows.filter((r) => r.weekId === lastWeekId)
    const last4Rows = skuRows.filter((r) => last4Ids.includes(r.weekId))
    const prev4Rows = skuRows.filter((r) => prev4Ids.includes(r.weekId))

    const currentStock = latestRows.reduce((s, r) => s + r.distributorStock, 0)
    const weeklySec = last4Rows.reduce((s, r) => s + r.secondary, 0) / Math.max(1, last4Ids.length)
    const weeklyPri = last4Rows.reduce((s, r) => s + r.primary, 0) / Math.max(1, last4Ids.length)
    const coverWeeks = weeklySec > 0 ? currentStock / weeklySec : 999

    // --- OVERSTOCK: cover > 6 weeks ---
    if (coverWeeks > 6 && currentStock > 1500) {
      const tied = Math.round(currentStock * sku.cost)
      insights.push({
        id: 'INS-' + (++id),
        type: 'overstock',
        severity: coverWeeks > 10 ? 'high' : 'medium',
        skuId: sku.id,
        skuName: sku.name,
        category: sku.category,
        title: `${sku.name} overstocked`,
        message: `${coverWeeks.toFixed(1)} wks cover (target 3-5) · ${Math.round(currentStock).toLocaleString('en-IN')} units · ${fmtInrInteger(tied)} tied capital`,
        metric: Math.round(coverWeeks * 10) / 10,
        metricLabel: 'weeks cover',
        action: 'Reduce next production run 20-30%; route surplus to higher-demand regions.',
        tiedCapital: tied,
      })
    }

    // --- STOCKOUT RISK: cover < 1.5 weeks & meaningful demand ---
    if (coverWeeks < 1.5 && weeklySec > 40) {
      insights.push({
        id: 'INS-' + (++id),
        type: 'stockout',
        severity: coverWeeks < 0.7 ? 'high' : 'medium',
        skuId: sku.id,
        skuName: sku.name,
        category: sku.category,
        title: `${sku.name} at stockout risk`,
        message: `Only ${coverWeeks.toFixed(1)} wks cover vs ${Math.round(weeklySec)} units/week demand`,
        metric: Math.round(coverWeeks * 10) / 10,
        metricLabel: 'weeks cover',
        action: `Expedite ${Math.round(weeklySec * 4)} units production and reallocate from high-cover regions.`,
      })
    }

    // --- DEMAND > SUPPLY (primary): secondary > primary by 15%+ in last 4 weeks ---
    if (weeklyPri > 0 && weeklySec / weeklyPri > 1.15 && weeklySec > 30) {
      const liftPct = (weeklySec / weeklyPri - 1) * 100
      insights.push({
        id: 'INS-' + (++id),
        type: 'demand_exceeds_supply',
        severity: liftPct > 30 ? 'high' : 'medium',
        skuId: sku.id,
        skuName: sku.name,
        category: sku.category,
        title: `Ramp production: ${sku.name}`,
        message: `Demand ${Math.round(weeklySec)}/wk vs supply ${Math.round(weeklyPri)}/wk · +${liftPct.toFixed(0)}% gap`,
        metric: Math.round(weeklySec / weeklyPri * 100) / 100,
        metricLabel: 'demand/supply ratio',
        action: `Increase production by ~${Math.round(liftPct)}% (≈${Math.round(weeklyPri * liftPct / 100 * 4)} extra units over the next 4 weeks).`,
      })
    }

    // --- DEMAND SPIKE: latest week vs prev-4wk avg > 25% ---
    const lastSec = latestRows.reduce((s, r) => s + r.secondary, 0)
    const prevAvg = prev4Rows.reduce((s, r) => s + r.secondary, 0) / Math.max(1, prev4Ids.length)
    if (prevAvg > 30 && lastSec / prevAvg > 1.25) {
      insights.push({
        id: 'INS-' + (++id),
        type: 'demand_spike',
        severity: lastSec / prevAvg > 1.5 ? 'high' : 'medium',
        skuId: sku.id,
        skuName: sku.name,
        category: sku.category,
        title: `${sku.name} demand spike`,
        message: `+${Math.round((lastSec / prevAvg - 1) * 100)}% WoW (${Math.round(lastSec)} vs ${Math.round(prevAvg)} avg)`,
        metric: Math.round(lastSec / prevAvg * 100) / 100,
        metricLabel: 'WoW ratio',
        action: 'Verify driver (campaign/seasonality) and pull-forward supply if sustainable.',
      })
    }
  }

  // --- SCHEME ROI: any category with a scheme that's showing lift ---
  // (lift = avg secondary in scheme-enabled weeks vs non-scheme baseline)
  const categorySchemes = {}
  for (const sku of skus) {
    if (!sku.scheme) continue
    const rows = weekly.filter((r) => r.skuId === sku.id)
    const avg = rows.reduce((s, r) => s + r.secondary, 0) / Math.max(1, rows.length)
    if (!categorySchemes[sku.category]) categorySchemes[sku.category] = { weeklyAvg: 0, skus: 0, label: sku.scheme.label }
    categorySchemes[sku.category].weeklyAvg += avg
    categorySchemes[sku.category].skus += 1
  }
  for (const [cat, info] of Object.entries(categorySchemes)) {
    const nonSchemeAvg = skus
      .filter((s) => s.category === cat && !s.scheme)
      .reduce((acc, s) => {
        const rows = weekly.filter((r) => r.skuId === s.id)
        return acc + rows.reduce((sum, r) => sum + r.secondary, 0) / Math.max(1, rows.length)
      }, 0)
    const lift = nonSchemeAvg > 0 ? (info.weeklyAvg / info.skus) / (nonSchemeAvg / Math.max(1, skus.filter((s) => s.category === cat && !s.scheme).length || 1)) : 1
    insights.push({
      id: 'INS-' + (++id),
      type: 'scheme_roi',
      severity: lift > 1.1 ? 'medium' : 'low',
      skuId: null,
      category: cat,
      title: `${cat} scheme lift`,
      message: `"${info.label}" scheme driving ${((lift - 1) * 100).toFixed(0)}% lift vs non-scheme baseline`,
      metric: Math.round(lift * 100) / 100,
      metricLabel: 'lift ratio',
      action: lift > 1.1 ? 'Consider extending scheme to wider SKU set.' : 'Scheme ROI is marginal — re-evaluate discount depth.',
    })
  }

  // --- DEMAND GROWTH: top 5 SKUs by WoW trend (surface even when not spiking) ---
  const growthRanked = []
  for (const sku of skus) {
    const skuRows = weekly.filter((r) => r.skuId === sku.id)
    const last = skuRows.filter((r) => r.weekId === lastWeekId).reduce((s, r) => s + r.secondary, 0)
    const prevAvg = skuRows.filter((r) => prev4Ids.includes(r.weekId)).reduce((s, r) => s + r.secondary, 0) / Math.max(1, prev4Ids.length)
    if (prevAvg > 20 && last > 0) {
      growthRanked.push({ sku, growth: (last - prevAvg) / prevAvg, last: Math.round(last), prev: Math.round(prevAvg) })
    }
  }
  growthRanked.sort((a, b) => b.growth - a.growth)
  for (const g of growthRanked.slice(0, 4)) {
    if (g.growth <= 0.05) continue // positive growth only
    insights.push({
      id: 'INS-' + (++id),
      type: 'demand_growth',
      severity: g.growth > 0.15 ? 'medium' : 'low',
      skuId: g.sku.id,
      skuName: g.sku.name,
      category: g.sku.category,
      title: `${g.sku.name} trending up`,
      message: `+${(g.growth * 100).toFixed(1)}% WoW growth (${g.last} vs ${g.prev} avg units/week)`,
      metric: Math.round(g.growth * 1000) / 10,
      metricLabel: '% WoW growth',
      action: 'Maintain supply headroom; consider schemes to convert growth momentum.',
    })
  }

  // --- UNDERPERFORMING DISTRIBUTOR: lowest-revenue per region ---
  const byDist = {}
  for (const r of weekly) {
    byDist[r.distributorId] = byDist[r.distributorId] || { distributorId: r.distributorId, revenue: 0, demand: 0 }
    byDist[r.distributorId].revenue += r.revenue
    byDist[r.distributorId].demand += r.secondary
  }
  const distList = Object.values(byDist).sort((a, b) => b.revenue - a.revenue)
  if (distList.length >= 2) {
    const bottom = distList[distList.length - 1]
    const top = distList[0]
    const d = (ds.distributors || []).find((x) => x.id === bottom.distributorId)
    const gap = ((top.revenue - bottom.revenue) / top.revenue) * 100
    if (gap > 20) {
      insights.push({
        id: 'INS-' + (++id),
        type: 'distributor_underperform',
        severity: gap > 40 ? 'medium' : 'low',
        skuId: null,
        title: `${d?.name || bottom.distributorId} underperforming`,
        message: `${fmtInrInteger(bottom.revenue)} revenue · ${gap.toFixed(0)}% behind top distributor`,
        metric: Math.round(gap),
        metricLabel: '% gap to leader',
        action: 'Audit secondary sales coverage, visit frequency, and scheme uptake with this partner.',
      })
    }
  }

  // Sort: high severity first, then by metric magnitude
  const sevOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => (sevOrder[a.severity] - sevOrder[b.severity]))

  _insightsCache = insights
  _insightsCacheAt = Date.now()
  return insights
}

// -----------------------------------------------------------------------
// Keyword-based intent classifier (drives card selection)
// -----------------------------------------------------------------------
function classifyIntent(text) {
  const t = (text || '').toLowerCase()
  if (/(stock.?out|running.?out|low.?stock|shortage|stock.?risk|risk of running)/.test(t)) return 'stockout'
  if (/(overstock|over.?stock|excess.?inv|too.?much.?stock|liquidat|surplus|dead.?stock|tied.?capital)/.test(t)) return 'overstock'
  if (/(increase.?production|ramp.?up|produce.?more|production.?up|grow.?supply|make.?more|step.?up.?supply)/.test(t)) return 'production_increase'
  if (/(spike|surge|jump|trending.?up|wow.?jump|week.?over.?week.?growth)/.test(t)) return 'demand_spike'
  // Distributor/channel intent — match either order (rank distributors, distributor rank, compare distributors, etc.)
  if (/(distributor|dealer|partner|channel|wholesaler)/.test(t) && /(rank|underperform|laggard|best|top|worst|compare|leaderboard|revenue|perform)/.test(t)) return 'distributor_rank'
  if (/^(rank|compare|top|best|worst)\b.*?(distributor|dealer|partner|channel)/.test(t)) return 'distributor_rank'
  if (/(scheme|promo|promotion|discount|roi|campaign|lift)/.test(t)) return 'scheme_roi'
  if (/(summary|executive|overview|snapshot|status.?update|week.?recap|headline)/.test(t)) return 'exec_summary'
  if (/(what.?if|scenario|simulate|if.?i.?cut|if.?i.?reduce|if.?i.?increase|reduce.?by.*?%)/.test(t)) return 'scenario'
  if (/(region|north|south|west|east)/.test(t)) return 'regional'
  return 'general'
}

// -----------------------------------------------------------------------
// Build structured cards for UI (grounded in insights)
// -----------------------------------------------------------------------
function buildCards(intent, insights, dataset) {
  const cards = []
  const byType = (type, n = 5) => insights.filter((i) => i.type === type).slice(0, n)

  // Helper: compute top-N by-cover SKUs as a generic fallback
  const coverSummary = (order = 'asc', n = 5) => {
    const weekly = dataset.weekly || []
    const weeks = dataset.weeks || []
    if (!weekly.length || !weeks.length) return []
    const lastWeekId = weeks[weeks.length - 1].weekId
    const last4Ids = weeks.slice(-4).map((w) => w.weekId)
    const rows = (dataset.skus || []).map((sku) => {
      const skuRows = weekly.filter((r) => r.skuId === sku.id)
      const currentStock = skuRows.filter((r) => r.weekId === lastWeekId).reduce((s, r) => s + r.distributorStock, 0)
      const weeklySec = skuRows.filter((r) => last4Ids.includes(r.weekId)).reduce((s, r) => s + r.secondary, 0) / Math.max(1, last4Ids.length)
      const cover = weeklySec > 0 ? currentStock / weeklySec : 999
      return { sku, cover, currentStock: Math.round(currentStock), weeklySec: Math.round(weeklySec) }
    }).filter((r) => r.weeklySec > 10)
    rows.sort((a, b) => order === 'asc' ? a.cover - b.cover : b.cover - a.cover)
    return rows.slice(0, n)
  }

  if (intent === 'stockout') {
    const rows = byType('stockout', 5)
    if (rows.length) {
      cards.push({
        kind: 'risk_table', title: 'Stockout Risks', accent: 'rose',
        columns: ['SKU', 'Category', 'Cover (wks)', 'Severity', 'Recommended Action'],
        rows: rows.map((i) => ({ sku: i.skuName, category: i.category, cover: i.metric.toFixed(1), severity: i.severity, action: i.action })),
      })
    } else {
      // Fallback: show lowest-cover SKUs even if none below threshold
      const low = coverSummary('asc', 5)
      cards.push({
        kind: 'risk_table', title: 'Lowest-Cover SKUs (no active stockout alerts)', accent: 'slate',
        columns: ['SKU', 'Current Stock', 'Weekly Demand', 'Cover (wks)', 'Status'],
        rows: low.map((r) => ({
          sku: r.sku.name, stock: r.currentStock.toLocaleString(), demand: r.weeklySec.toLocaleString(),
          cover: r.cover.toFixed(1),
          status: r.cover < 3 ? 'watch' : r.cover < 5 ? 'healthy' : 'overstock',
        })),
      })
    }
  } else if (intent === 'overstock') {
    const rows = byType('overstock', 5)
    if (rows.length) cards.push({
      kind: 'risk_table', title: 'Top Overstock Alerts', accent: 'amber',
      columns: ['SKU', 'Cover (wks)', 'Tied Capital', 'Severity', 'Recommended Action'],
      rows: rows.map((i) => ({ sku: i.skuName, cover: i.metric.toFixed(1), capital: fmtInrInteger(i.tiedCapital || 0), severity: i.severity, action: i.action })),
    })
  } else if (intent === 'production_increase') {
    const rows = byType('demand_exceeds_supply', 5)
    if (rows.length) {
      cards.push({
        kind: 'rec_list', title: 'Production Ramp Recommendations', accent: 'blue',
        items: rows.map((i) => ({ skuId: i.skuId, title: i.skuName, detail: i.message, action: i.action, severity: i.severity })),
      })
    } else {
      // Fallback: show growing SKUs (positive WoW) which might warrant more production
      const growth = byType('demand_growth', 5)
      if (growth.length) cards.push({
        kind: 'rec_list', title: 'SKUs Trending Up (candidates for production headroom)', accent: 'blue',
        items: growth.map((i) => ({ skuId: i.skuId, title: i.skuName, detail: i.message, action: i.action, severity: i.severity })),
      })
      // Also show the overstocked side — network is net-long, so inverse story
      const overs = byType('overstock', 3)
      if (overs.length) cards.push({
        kind: 'rec_list', title: 'Consider REDUCING instead — current overstock', accent: 'amber',
        items: overs.map((i) => ({ skuId: i.skuId, title: i.skuName, detail: i.message, action: i.action, severity: i.severity })),
      })
    }
  } else if (intent === 'demand_spike') {
    const rows = byType('demand_spike', 5).concat(byType('demand_growth', 5))
    const seen = new Set()
    const merged = rows.filter((r) => (seen.has(r.skuId) ? false : (seen.add(r.skuId), true))).slice(0, 5)
    if (merged.length) cards.push({
      kind: 'rec_list', title: 'Demand Spikes & Growth', accent: 'violet',
      items: merged.map((i) => ({ skuId: i.skuId, title: i.skuName, detail: i.message, action: i.action, severity: i.severity })),
    })
  } else if (intent === 'distributor_rank') {
    const byDist = aggregate(dataset.weekly, 'distributorId')
    const ranked = [...byDist].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    cards.push({
      kind: 'rank_table', title: 'Distributor Leaderboard', accent: 'emerald',
      columns: ['Rank', 'Distributor', 'Region', 'Revenue', 'Demand (units)'],
      rows: ranked.map((r, idx) => {
        const d = (dataset.distributors || []).find((x) => x.id === r.key) || {}
        return { rank: idx + 1, distributor: d.name || r.key, region: d.region, revenue: fmtInrInteger(r.revenue), demand: Math.round(r.demand || 0).toLocaleString('en-IN') }
      }),
    })
    const underperform = byType('distributor_underperform', 2)
    if (underperform.length) cards.push({
      kind: 'rec_list', title: 'Underperformers', accent: 'rose',
      items: underperform.map((i) => ({ skuId: null, title: i.title, detail: i.message, action: i.action, severity: i.severity })),
    })
  } else if (intent === 'scheme_roi') {
    const rows = byType('scheme_roi', 5)
    if (rows.length) cards.push({
      kind: 'rec_list', title: 'Scheme Performance', accent: 'violet',
      items: rows.map((i) => ({ skuId: i.category, title: `${i.category} · ${(i.metric * 100 - 100).toFixed(0)}% lift`, detail: i.message, action: i.action, severity: i.severity })),
    })
  } else if (intent === 'regional') {
    const byReg = aggregate(dataset.weekly, 'regionId')
    cards.push({
      kind: 'rank_table', title: 'Regional Performance', accent: 'blue',
      columns: ['Region', 'Revenue', 'Demand (units)', 'Share'],
      rows: byReg.sort((a, b) => b.revenue - a.revenue).map((r) => {
        const reg = (dataset.regions || []).find((x) => x.id === r.key)
        const total = byReg.reduce((s, x) => s + x.revenue, 0)
        return { region: reg?.name || r.key, revenue: fmtInrInteger(r.revenue), demand: Math.round(r.demand || 0).toLocaleString('en-IN'), share: ((r.revenue / total) * 100).toFixed(1) + '%' }
      }),
    })
  } else {
    // exec_summary / general / scenario — show top 4 mixed insights
    const top = insights.slice(0, 4)
    if (top.length) cards.push({
      kind: 'rec_list', title: 'Top Exceptions This Week', accent: 'blue',
      items: top.map((i) => ({ skuId: i.skuId || i.category, title: i.title, detail: i.message, action: i.action, severity: i.severity })),
    })
  }

  return cards
}

// -----------------------------------------------------------------------
// Curated suggested questions (seeded on first chat session render)
// -----------------------------------------------------------------------
const SUGGESTED_QUESTIONS = [
  { category: 'Stock Risk',    q: 'Which SKU has the highest stock risk right now?' },
  { category: 'Stock Risk',    q: 'Show me all overstock alerts with tied capital over ₹40 lakh.' },
  { category: 'Production',    q: 'What should we increase production for?' },
  { category: 'Production',    q: 'Which SKUs have demand outpacing supply?' },
  { category: 'Distribution',  q: 'Rank distributors by revenue and highlight laggards.' },
  { category: 'Schemes',       q: 'Are our current schemes driving incremental demand?' },
  { category: 'Demand',        q: 'Which SKUs are trending up week-over-week?' },
  { category: 'Scenarios',     q: 'If I cut production by 15% next month, which SKUs will stock out first?' },
  { category: 'Summary',       q: 'Give me an executive summary of this week.' },
]

// -----------------------------------------------------------------------
// Groq Llama 3.1 8B Instant wrapper (OpenAI-compatible)
// -----------------------------------------------------------------------
async function callGroq(messages, { temperature = 0.3, maxTokens = 700 } = {}) {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured on the server')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Groq API ${res.status}: ${txt.slice(0, 300)}`)
  }
  const j = await res.json()
  return {
    content: j.choices?.[0]?.message?.content || '',
    finishReason: j.choices?.[0]?.finish_reason,
    usage: j.usage,
    model: j.model,
  }
}

// -----------------------------------------------------------------------
// Build the system prompt with relevant S&OP data context
// -----------------------------------------------------------------------
function buildChatSystemPrompt(dataset, insights, intent) {
  const k = kpis(dataset.weekly, dataset.weeks)

  const ctx = []
  ctx.push(`## Network KPIs (last ${dataset.meta?.weekCount || 26} weeks)
- Total Revenue: ${fmtInrMoney(k.totalRevenue)}
- Gross Margin: ${fmtInrMoney(k.totalGm)} (${k.gmPct.toFixed(1)}%)
- Total Demand: ${Math.round(k.totalDemand).toLocaleString('en-IN')} units (${(k.demandWoW || 0).toFixed(1)}% WoW)`)

  const topInsights = insights.slice(0, 10)
  if (topInsights.length) {
    ctx.push(`## Top Exception Alerts (${topInsights.length} of ${insights.length})\n` +
      topInsights.map((i) => `- [${i.severity.toUpperCase()}] ${i.title} · ${i.message} → ${i.action}`).join('\n'))
  }

  const cats = [...new Set((dataset.skus || []).map((s) => s.category))]
  ctx.push(`## Master Data
- ${dataset.skus?.length || 0} SKUs across ${cats.length} categories: ${cats.join(', ')}
- ${dataset.distributors?.length || 0} distributors: ${(dataset.distributors || []).map((d) => `${d.name} (${d.region}·T${d.tier})`).join(', ')}
- ${dataset.regions?.length || 0} regions`)

  // Intent-specific data slices
  if (intent === 'distributor_rank') {
    const byDist = aggregate(dataset.weekly, 'distributorId')
    const ranked = [...byDist].sort((a, b) => b.revenue - a.revenue)
    ctx.push(`## Distributor Revenue Ranking\n` +
      ranked.map((r, idx) => {
        const d = (dataset.distributors || []).find((x) => x.id === r.key) || {}
        return `${idx + 1}. ${d.name || r.key} (${d.region}) — ${fmtInrInteger(r.revenue)}`
      }).join('\n'))
  }

  return `You are an S&OP AI analyst for a consumer electronics enterprise (mobile devices and accessories). You provide crisp, executive-style answers grounded in the data below. You NEVER invent SKUs, distributors, numbers, or revenues that are not present in the context.

## How to read the data (IMPORTANT)
- "Weeks of cover" = distributor stock ÷ weekly secondary demand.
- Target range = **3 to 5 weeks**.
- Cover < 1.5 weeks → **stockout risk** (too little stock; expedite production).
- Cover between 1.5 and 3 → running lean (watch).
- Cover 3 to 5 → **healthy**.
- Cover 5 to 6 → slightly long.
- Cover > 6 → **overstock** (too much stock tying up capital; REDUCE production).
- Example: if an SKU shows "10.1 weeks of cover", it is OVERSTOCKED, NOT at stockout risk. Recommend reducing supply, not increasing it.
- WoW = week over week. "-2% WoW demand" means demand slightly fell from last week.
- "Primary" = factory → distributor. "Secondary" = distributor → retailer. "Tertiary" = retailer → consumer.
- When weekly secondary demand > primary shipments consistently, supply is short → increase production.

## Response guidelines
- Lead with the answer. Be direct.
- Use bullets or very short paragraphs. Hard limit ~160 words.
- Cite SKU names, numbers, and actions **only from the context below**. If the data doesn't contain what's asked, say so plainly.
- Prioritize the 2–3 highest-impact actions when recommending.
- Use ₹ (INR) for money; never introduce other currencies.
- No emojis. No filler like "I hope this helps".
- If the question is off-topic, briefly say you focus on S&OP insights.

## Current Data Context
${ctx.join('\n\n')}

Now answer the user's question using ONLY this data.`
}

export async function GET(request, { params }) {
  const path = (params?.path || []).join('/')

  // ---- Health ----------------------------------------------------------
  if (path === '' || path === 'health') {
    return NextResponse.json({ status: 'ok', service: 'S&OP Demo API' })
  }

  // ---- Dataset endpoints ----------------------------------------------
  if (path === 'data/meta') return NextResponse.json(getDataset().meta)
  if (path === 'data/skus') return NextResponse.json(SKUS)
  if (path === 'data/distributors') return NextResponse.json(DISTRIBUTORS)
  if (path === 'data/regions') return NextResponse.json(REGIONS)
  if (path === 'data/weeks') return NextResponse.json(getDataset().weeks)
  if (path === 'data/kpis') return NextResponse.json(kpis())

  if (path === 'data/weekly') {
    const rows = filterWeekly(q(request))
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'data/aggregate') {
    const { by = 'weekId', ...filters } = q(request)
    const rows = filterWeekly(filters)
    const agg = aggregate(rows, by)
    agg.sort((a, b) => (a.key > b.key ? 1 : -1))
    return NextResponse.json({ groupBy: by, count: agg.length, rows: agg })
  }

  // ---- Order endpoints -------------------------------------------------
  // GET /api/orders/suggest?distributorId=DST-001
  if (path === 'orders/suggest') {
    const { distributorId } = q(request)
    if (!distributorId) {
      return NextResponse.json({ error: 'distributorId required' }, { status: 400 })
    }
    const suggestion = suggestOrders(distributorId)
    if (!suggestion.distributor) {
      return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
    }
    return NextResponse.json(suggestion)
  }

  // GET /api/orders/dealer-activation-gap?distributorId=DST-001
  // SKU-wise "stocked dealers vs active dealers last week" opportunity view.
  if (path === 'orders/dealer-activation-gap') {
    const { distributorId } = q(request)
    if (!distributorId) {
      return NextResponse.json({ error: 'distributorId required' }, { status: 400 })
    }
    const payload = buildDealerActivationGap(distributorId)
    if (!payload.distributor) {
      return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
    }
    return NextResponse.json(payload)
  }

  // -------- CHATBOT endpoints (GET) -----------------------------------
  if (path === 'chat/insights') {
    const insights = buildInsights()
    const bySeverity = { high: 0, medium: 0, low: 0 }
    for (const i of insights) bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
    return NextResponse.json({
      count: insights.length,
      bySeverity,
      insights,
    })
  }

  if (path === 'chat/suggestions') {
    return NextResponse.json({ count: SUGGESTED_QUESTIONS.length, suggestions: SUGGESTED_QUESTIONS })
  }

  if (path === 'chat/health') {
    return NextResponse.json({
      hasGroqKey: !!process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      activeSessions: chatSessions.size,
    })
  }

  // GET /api/orders/rules?simDay=N   — expose current lock state + rule schema
  if (path === 'orders/rules') {
    const { simDay } = q(request)
    return NextResponse.json({
      lockState: computeLockState(simDay),
      rules: [
        { window: 'Day 1–24',  state: 'editable',   label: 'Fully editable',            maxDeltaPct: null },
        { window: 'Day 25–28', state: 'restricted', label: 'Max ±10% per-line change',  maxDeltaPct: 10 },
        { window: 'Day 29+',   state: 'locked',     label: 'Locked · approval required', maxDeltaPct: 0 },
      ],
    })
  }

  // GET /api/orders/dispatch-visibility?distributorId=DST-001
  // Rolls up placed order lines per SKU, simulates dispatch vs order (rule + stable jitter).
  // When no saved orders exist, uses suggested pipeline qtys so the module is never empty.
  if (path === 'orders/dispatch-visibility') {
    const query = q(request)
    const { distributorId } = query
    if (!distributorId) {
      return NextResponse.json({ error: 'distributorId required' }, { status: 400 })
    }
    const distributor = DISTRIBUTORS.find((d) => d.id === distributorId)
    if (!distributor) {
      return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
    }

    let dataSource = 'placed_orders'
    let orderedInputs = []

    try {
      const col = await getOrdersCollection()
      const orders = await col
        .find({ distributorId }, { projection: { _id: 0, status: 1, lines: 1 } })
        .sort({ createdAt: -1 })
        .limit(80)
        .toArray()

      const skip = new Set(['Rejected'])
      const agg = new Map()
      for (const o of orders) {
        if (skip.has(o.status)) continue
        for (const ln of o.lines || []) {
          const qn = Math.max(0, Math.round(Number(ln.qty) || 0))
          if (qn <= 0) continue
          const prev = agg.get(ln.skuId) || 0
          agg.set(ln.skuId, prev + qn)
        }
      }
      orderedInputs = [...agg.entries()].map(([skuId, orderedQty]) => {
        const sku = SKUS.find((s) => s.id === skuId)
        return { skuId, orderedQty, skuName: sku?.name }
      })
    } catch {
      orderedInputs = []
    }

    if (!orderedInputs.length) {
      const suggestion = suggestOrders(distributorId)
      orderedInputs = (suggestion.lines || [])
        .filter((l) => l.suggestedQty > 0)
        .map((l) => ({
          skuId: l.skuId,
          orderedQty: l.suggestedQty,
          skuName: l.skuName,
        }))
      dataSource = 'suggested_pipeline'
    }

    const rows = buildDispatchVisibilityRows(distributorId, orderedInputs)
    const totalOrdered = rows.reduce((s, r) => s + r.orderedQty, 0)
    const totalDispatched = rows.reduce((s, r) => s + r.dispatchedQty, 0)
    const totalGap = rows.reduce((s, r) => s + r.gap, 0)
    const byStatus = { 'Fully fulfilled': 0, Partial: 0, Pending: 0 }
    for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1

    return NextResponse.json({
      distributorId,
      distributorName: distributor.name,
      region: distributor.region,
      tier: distributor.tier,
      dataSource,
      dataSourceHint:
        dataSource === 'placed_orders'
          ? 'Aggregated from saved distributor orders (non-rejected).'
          : 'No placed orders yet — showing suggested pipeline quantities as a stand-in for “committed demand”.',
      summary: {
        skuLines: rows.length,
        totalOrdered,
        totalDispatched,
        totalGap,
        fulfilmentPct: totalOrdered ? Math.round((totalDispatched / totalOrdered) * 1000) / 10 : 0,
        byStatus,
      },
      rows,
    })
  }

  // GET /api/orders  OR  GET /api/orders?distributorId=DST-001&simDay=26
  if (path === 'orders') {
    try {
      const col = await getOrdersCollection()
      const filter = {}
      const query = q(request)
      if (query.distributorId) filter.distributorId = query.distributorId
      const orders = await col
        .find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()
      const lockState = computeLockState(query.simDay)
      return NextResponse.json({
        count: orders.length,
        lockState,
        orders: orders.map((o) => ({ ...o, lockState })),
      })
    } catch (e) {
      return NextResponse.json({ error: e.message, count: 0, orders: [] }, { status: 500 })
    }
  }

  return NextResponse.json({ message: `GET /api/${path}` })
}

export async function POST(request, { params }) {
  const path = (params?.path || []).join('/')

  // -------- CHATBOT endpoints (POST) ----------------------------------
  if (path === 'chat/message') {
    try {
      const body = await request.json()
      const { sessionId, message } = body || {}
      if (!message || typeof message !== 'string' || !message.trim()) {
        return NextResponse.json({ error: 'message is required' }, { status: 400 })
      }

      const session = getOrCreateSession(sessionId)
      const dataset = getDataset()
      const insights = buildInsights()
      const intent = classifyIntent(message)

      const systemPrompt = buildChatSystemPrompt(dataset, insights, intent)

      // Trim history to last 6 turns (3 user + 3 assistant) to stay under 8K context
      const history = (session.messages || []).slice(-6).map((m) => ({ role: m.role, content: m.content }))
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message.trim() },
      ]

      let replyContent = ''
      let llmUsage = null
      let llmError = null
      try {
        const r = await callGroq(messages, { temperature: 0.3, maxTokens: 650 })
        replyContent = r.content
        llmUsage = r.usage
      } catch (e) {
        llmError = e.message
        // Fallback response so the chat still works
        const top = insights.slice(0, 3)
        replyContent = top.length
          ? `Here's what I'm seeing based on the live data (LLM fallback):\n\n` +
            top.map((i) => `• ${i.title} — ${i.message}\n  Action: ${i.action}`).join('\n\n')
          : `I couldn't reach the language model right now. Please try again in a moment.`
      }

      // Persist turn
      session.messages.push({ role: 'user', content: message.trim(), ts: new Date().toISOString() })
      session.messages.push({ role: 'assistant', content: replyContent, ts: new Date().toISOString(), intent })

      // Build structured cards from the rule engine (always, even when LLM fails)
      const cards = buildCards(intent, insights, dataset)
      const insightsUsed = insights.slice(0, 3).map((i) => ({ id: i.id, type: i.type, title: i.title, severity: i.severity }))

      return NextResponse.json({
        sessionId: session.sessionId,
        reply: replyContent,
        intent,
        cards,
        insightsUsed,
        llmUsage,
        llmError,
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  if (path === 'chat/session/reset') {
    try {
      const body = await request.json().catch(() => ({}))
      const { sessionId } = body || {}
      if (sessionId && chatSessions.has(sessionId)) chatSessions.delete(sessionId)
      const fresh = getOrCreateSession(null)
      return NextResponse.json({ sessionId: fresh.sessionId, ok: true })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // POST /api/orders/place
  if (path === 'orders/place') {
    try {
      const body = await request.json()
      const { distributorId, lines = [], notes, simDay } = body
      if (!distributorId || !Array.isArray(lines) || lines.length === 0) {
        return NextResponse.json({ error: 'distributorId and non-empty lines are required' }, { status: 400 })
      }

      const distributor = DISTRIBUTORS.find((d) => d.id === distributorId)
      if (!distributor) {
        return NextResponse.json({ error: `Unknown distributor ${distributorId}` }, { status: 404 })
      }

      // Recompute suggestions so we can enrich the saved lines with price/scheme
      const suggestion = suggestOrders(distributorId)
      const built = enrichLines(distributorId, lines)

      if (!built.lines.length) {
        return NextResponse.json({ error: 'All order lines were empty/invalid' }, { status: 400 })
      }

      const orderDoc = {
        orderId: 'ORD-' + uuidv4().slice(0, 8).toUpperCase(),
        distributorId,
        distributorName: distributor.name,
        region: distributor.region,
        status: 'Pending',
        totalQty: built.totalQty,
        totalValue: built.totalValue,
        cashflow: built.cashflow,
        leadTimeDays: suggestion.leadTimeDays,
        tentativeDeliveryDate: suggestion.tentativeDeliveryDate,
        notes: notes || null,
        lines: built.lines,
        pendingApproval: null,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: null,
      }

      const col = await getOrdersCollection()
      await col.insertOne(orderDoc)

      // Strip Mongo _id from response & decorate with current lockState
      const { _id, ...clean } = orderDoc
      return NextResponse.json(
        { ok: true, order: { ...clean, lockState: computeLockState(simDay) } },
        { status: 201 }
      )
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ message: `POST /api/${path}`, received: body })
}

// =======================================================================
// PATCH /api/orders/update
// -----------------------------------------------------------------------
// Body: { orderId, lines:[{skuId,qty}], action?, note?, simDay? }
//   action ∈ { "edit" (default), "request_approval", "approve", "reject" }
//
// Rules enforced against the current lockState (today or simDay override):
//   • editable   → any edit allowed (status → 'Amended')
//   • restricted → per-line qty change must be ≤ ±10% (else 400)
//   • locked     → action=edit returns 403;
//                  action=request_approval stores pendingApproval & sets
//                    status='Pending Approval' (HTTP 202)
//   • action=approve → applies pendingApproval, status='Approved'
//   • action=reject  → discards pendingApproval, status='Rejected'
// =======================================================================
export async function PATCH(request, { params }) {
  const path = (params?.path || []).join('/')

  if (path === 'orders/update') {
    try {
      const body = await request.json()
      const { orderId, lines = [], action = 'edit', note = null, simDay = null } = body
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
      }

      const col = await getOrdersCollection()
      const existing = await col.findOne({ orderId }, { projection: { _id: 0 } })
      if (!existing) {
        return NextResponse.json({ error: `Order ${orderId} not found` }, { status: 404 })
      }

      const lockState = computeLockState(simDay)
      const origBySku = Object.fromEntries((existing.lines || []).map((l) => [l.skuId, l]))

      // Max |Δ%| per-line between existing and the proposed lines.
      // Adding an all-new SKU (original qty = 0) counts as Infinity (>100%).
      const maxDeltaPct = (newLines) => {
        let max = 0
        const skus = new Set([
          ...Object.keys(origBySku),
          ...newLines.map((l) => l.skuId),
        ])
        for (const skuId of skus) {
          const o = origBySku[skuId]?.qty || 0
          const n = Math.max(0, Math.round(Number((newLines.find((l) => l.skuId === skuId) || {}).qty) || 0))
          if (o === 0 && n === 0) continue
          if (o === 0) return Infinity
          const pct = Math.abs((n - o) / o) * 100
          if (pct > max) max = pct
        }
        return max
      }

      // ---- APPROVE: commit the pending change ----------------------------
      if (action === 'approve') {
        const p = existing.pendingApproval
        if (!p || p.status !== 'pending') {
          return NextResponse.json({ error: 'No pending approval to approve' }, { status: 400 })
        }
        await col.updateOne({ orderId }, {
          $set: {
            lines: p.requestedLines,
            totalQty: p.requestedTotalQty,
            totalValue: p.requestedTotalValue,
            cashflow: p.requestedCashflow,
            status: 'Approved',
            pendingApproval: {
              ...p,
              status: 'approved',
              decidedAt: new Date().toISOString(),
              decidedBy: 'Demo Approver',
              approvalNote: note || null,
            },
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
        return NextResponse.json({ ok: true, action: 'approved', order: { ...u, lockState } })
      }

      // ---- REJECT: discard the pending change ----------------------------
      if (action === 'reject') {
        const p = existing.pendingApproval
        if (!p || p.status !== 'pending') {
          return NextResponse.json({ error: 'No pending approval to reject' }, { status: 400 })
        }
        await col.updateOne({ orderId }, {
          $set: {
            status: 'Rejected',
            pendingApproval: {
              ...p,
              status: 'rejected',
              decidedAt: new Date().toISOString(),
              decidedBy: 'Demo Approver',
              rejectionNote: note || null,
            },
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
        return NextResponse.json({ ok: true, action: 'rejected', order: { ...u, lockState } })
      }

      // ---- REQUEST APPROVAL: allowed only when locked --------------------
      if (action === 'request_approval') {
        if (lockState.state !== 'locked') {
          return NextResponse.json({
            error: `Approval is only needed when the order is locked. Current state: ${lockState.state}.`,
            lockState,
          }, { status: 400 })
        }
        const built = enrichLines(existing.distributorId, lines)
        if (!built.lines.length) {
          return NextResponse.json({ error: 'At least one non-zero line is required for approval request' }, { status: 400 })
        }
        const pending = {
          requestedAt: new Date().toISOString(),
          requestedBy: 'Demo Planner',
          requestedLines: built.lines,
          requestedTotalQty: built.totalQty,
          requestedTotalValue: built.totalValue,
          requestedCashflow: built.cashflow,
          note: note || null,
          status: 'pending',
          reason: `Order locked (day ${lockState.day} ≥ 29). Awaiting governance approval.`,
        }
        await col.updateOne({ orderId }, {
          $set: {
            status: 'Pending Approval',
            pendingApproval: pending,
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
        return NextResponse.json({ ok: true, action: 'approval_requested', order: { ...u, lockState } }, { status: 202 })
      }

      // ---- DEFAULT: EDIT (subject to window rules) -----------------------
      if (lockState.state === 'locked') {
        return NextResponse.json({
          error: `Order is locked (day ${lockState.day} ≥ 29). Submit action="request_approval" to route for approval.`,
          lockState,
        }, { status: 403 })
      }

      if (lockState.state === 'restricted') {
        const mdp = maxDeltaPct(lines)
        if (mdp > 10) {
          return NextResponse.json({
            error: `Restricted window (day 25–28). Per-line qty changes are capped at ±10%. Your change was ${mdp === Infinity ? '>100' : mdp.toFixed(1)}%.`,
            maxDeltaPct: mdp === Infinity ? 999 : Math.round(mdp * 100) / 100,
            lockState,
          }, { status: 400 })
        }
      }

      const built = enrichLines(existing.distributorId, lines)
      if (!built.lines.length) {
        return NextResponse.json({ error: 'At least one non-zero line is required' }, { status: 400 })
      }

      await col.updateOne({ orderId }, {
        $set: {
          lines: built.lines,
          totalQty: built.totalQty,
          totalValue: built.totalValue,
          cashflow: built.cashflow,
          status: 'Amended',
          lastUpdatedAt: new Date().toISOString(),
        },
      })
      const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
      return NextResponse.json({ ok: true, action: 'edited', order: { ...u, lockState } })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ message: `PATCH /api/${path}` }, { status: 404 })
}
