// =======================================================================
// S&OP Demo – Central Dummy Data Module (Lava mobiles portfolio)
// -----------------------------------------------------------------------
// Generates a deterministic dataset used across every module:
//   • 15 SKUs  • 5 Distributors  • 3 Regions  • 26 weekly buckets (6 mo)
//
// The dataset is generated ONCE on first access and cached in module
// memory so all API responses are consistent within the process.
// =======================================================================

import { DEMO_INR_PER_USD } from './utils'

// ---- Seeded PRNG (Mulberry32) for reproducibility -----------------------
function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20250701)
const rnd = (min, max) => min + rand() * (max - min)
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const toInrListPrice = (inrPrice) => inrPrice

// ---- Master Data --------------------------------------------------------
export const REGIONS = [
  { id: 'REG-N', name: 'North', color: '#3b82f6' },
  { id: 'REG-S', name: 'South', color: '#10b981' },
  { id: 'REG-W', name: 'West', color: '#f59e0b' },
]

export const DISTRIBUTORS = [
  { id: 'DST-001', name: 'Lava North Distribution Hub', region: 'North', tier: 'A' },
  { id: 'DST-002', name: 'Western Mobility Channel Partners', region: 'West', tier: 'A' },
  { id: 'DST-003', name: 'Northland Device Distributors', region: 'North', tier: 'B' },
  { id: 'DST-004', name: 'South Digital Retail Network', region: 'South', tier: 'A' },
  { id: 'DST-005', name: 'West Bharat Telecom Traders', region: 'West', tier: 'C' },
]

const DIST_FACTOR = { 'DST-001': 1.30, 'DST-002': 1.10, 'DST-003': 0.85, 'DST-004': 1.15, 'DST-005': 0.60 }

export const SKUS = [
  { id: 'SKU-10842', name: 'Lava Blaze Curve 5G 8GB/128GB (Hero SKU)', category: 'Smartphones - Blaze Series', price: toInrListPrice(17999), cost: toInrListPrice(13800), baseWeekly: 760, seasonPeakWeek: 43, seasonAmp: 0.30, growth: 0.006 },
  { id: 'SKU-10843', name: 'Lava Blaze 2 5G 6GB/128GB',                category: 'Smartphones - Blaze Series', price: toInrListPrice(10999), cost: toInrListPrice(8400),  baseWeekly: 850, seasonPeakWeek: 41, seasonAmp: 0.24, growth: 0.003 },
  { id: 'SKU-10844', name: 'Lava Blaze X 5G 8GB/128GB',                category: 'Smartphones - Blaze Series', price: toInrListPrice(14999), cost: toInrListPrice(11500), baseWeekly: 520, seasonPeakWeek: 42, seasonAmp: 0.32, growth: 0.007 },
  { id: 'SKU-10845', name: 'Lava Blaze Pro 5G 8GB/128GB',              category: 'Smartphones - Blaze Series', price: toInrListPrice(12999), cost: toInrListPrice(9900),  baseWeekly: 440, seasonPeakWeek: 42, seasonAmp: 0.34, growth: 0.005 },
  { id: 'SKU-20591', name: 'Lava Yuva 5G 4GB/128GB',                   category: 'Smartphones - Yuva Series',  price: toInrListPrice(9499),  cost: toInrListPrice(7200),  baseWeekly: 780, seasonPeakWeek: 36, seasonAmp: 0.22, growth: 0.008 },
  { id: 'SKU-20592', name: 'Lava Yuva 3 Pro 8GB/128GB',                category: 'Smartphones - Yuva Series',  price: toInrListPrice(8999),  cost: toInrListPrice(6800),  baseWeekly: 900, seasonPeakWeek: 35, seasonAmp: 0.26, growth: 0.004 },
  { id: 'SKU-20593', name: 'Lava O2 8GB/128GB',                        category: 'Smartphones - Yuva Series',  price: toInrListPrice(7999),  cost: toInrListPrice(6100),  baseWeekly: 660, seasonPeakWeek: 34, seasonAmp: 0.24, growth: 0.006 },
  { id: 'SKU-30220', name: 'Lava Agni 3 5G 8GB/256GB',                 category: 'Smartphones - Premium 5G',   price: toInrListPrice(23999), cost: toInrListPrice(18200), baseWeekly: 480, seasonPeakWeek: 46, seasonAmp: 0.38, growth: 0.009 },
  { id: 'SKU-30221', name: 'Lava Storm 5G 8GB/128GB',                  category: 'Smartphones - Premium 5G',   price: toInrListPrice(13499), cost: toInrListPrice(10200), baseWeekly: 400, seasonPeakWeek: 44, seasonAmp: 0.33, growth: 0.007 },
  { id: 'SKU-30222', name: 'Lava Agni 2 5G 8GB/256GB',                 category: 'Smartphones - Premium 5G',   price: toInrListPrice(19999), cost: toInrListPrice(15200), baseWeekly: 340, seasonPeakWeek: 45, seasonAmp: 0.35, growth: 0.005 },
  { id: 'SKU-40117', name: 'Lava A1 Josh Feature Phone',               category: 'Feature Phones',             price: toInrListPrice(1299),  cost: toInrListPrice(950),   baseWeekly: 1200, seasonPeakWeek: 20, seasonAmp: 0.16, growth: -0.001 },
  { id: 'SKU-40118', name: 'Lava A3 Power Feature Phone',              category: 'Feature Phones',             price: toInrListPrice(1499),  cost: toInrListPrice(1100),  baseWeekly: 920, seasonPeakWeek: 21, seasonAmp: 0.14, growth: 0.001 },
  { id: 'SKU-40119', name: 'Lava Hero 600 Feature Phone',              category: 'Feature Phones',             price: toInrListPrice(1199),  cost: toInrListPrice(880),   baseWeekly: 1100, seasonPeakWeek: 19, seasonAmp: 0.15, growth: 0.000 },
  { id: 'SKU-50803', name: 'Lava Probuds N31 Neckband',                category: 'Accessories and Wearables',  price: toInrListPrice(999),   cost: toInrListPrice(700),   baseWeekly: 1500, seasonPeakWeek: 47, seasonAmp: 0.27, growth: 0.010 },
  { id: 'SKU-50804', name: 'Lava Probuds T24 TWS Earbuds',             category: 'Accessories and Wearables',  price: toInrListPrice(1499),  cost: toInrListPrice(1050),  baseWeekly: 1300, seasonPeakWeek: 47, seasonAmp: 0.30, growth: 0.011 },
]

function buildWeeks(count = 26, anchor = new Date('2025-08-10')) {
  const weeks = []
  const d = new Date(anchor)
  const day = d.getUTCDay() || 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(d)
    start.setUTCDate(d.getUTCDate() - i * 7)
    const jan1 = new Date(Date.UTC(start.getUTCFullYear(), 0, 1))
    const dayOfYear = Math.floor((start - jan1) / 86400000) + 1
    const weekNum = Math.ceil((dayOfYear + ((jan1.getUTCDay() || 7) - 1)) / 7)
    weeks.push({
      weekId: `${start.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`,
      weekNumber: weekNum,
      year: start.getUTCFullYear(),
      weekStart: start.toISOString().slice(0, 10),
      label: `W${String(weekNum).padStart(2, '0')}`,
    })
  }
  return weeks
}

function seasonality(weekOfYear, peak, amp) {
  const phase = ((weekOfYear - peak) / 52) * 2 * Math.PI
  return 1 + amp * Math.cos(phase)
}

function generateDataset() {
  const weeks = buildWeeks(26)
  const weekly = []

  for (const sku of SKUS) {
    for (const dist of DISTRIBUTORS) {
      let distStock = sku.baseWeekly * DIST_FACTOR[dist.id] * rnd(1.8, 2.4)
      let retailStock = sku.baseWeekly * DIST_FACTOR[dist.id] * rnd(0.6, 1.1)

      weeks.forEach((w, idx) => {
        const seas = seasonality(w.weekNumber, sku.seasonPeakWeek, sku.seasonAmp)
        const trend = 1 + sku.growth * idx
        const noise = rnd(0.88, 1.12)

        const tertiary = Math.max(0, Math.round(
          sku.baseWeekly * DIST_FACTOR[dist.id] * seas * trend * noise
        ))
        const secondary = Math.max(0, Math.round(tertiary * rnd(1.00, 1.15)))
        const primary = Math.max(0, Math.round(secondary * rnd(0.85, 1.35)))

        distStock = Math.max(0, distStock + primary - secondary)
        retailStock = Math.max(0, retailStock + secondary - tertiary)

        const promo = rand() < 0.08 ? rnd(0.85, 0.92) : 1
        const price = round(sku.price * promo, 2)
        const cost = round(sku.cost * rnd(0.98, 1.04), 2)

        weekly.push({
          skuId: sku.id,
          skuName: sku.name,
          category: sku.category,
          region: dist.region,
          distributorId: dist.id,
          distributor: dist.name,
          weekId: w.weekId,
          weekStart: w.weekStart,
          weekLabel: w.label,
          weekNumber: w.weekNumber,
          demand: tertiary,
          tertiary,
          secondary,
          primary,
          retailStock: Math.round(retailStock),
          distributorStock: Math.round(distStock),
          price,
          cost,
          revenue: round(price * secondary, 2),
          gm: round((price - cost) * secondary, 2),
        })
      })
    }
  }

  return { weeks, weekly }
}

let _cache = null
export function getDataset() {
  if (!_cache) {
    const { weeks, weekly } = generateDataset()
    _cache = {
      meta: {
        generatedAt: new Date().toISOString(),
        skuCount: SKUS.length,
        distributorCount: DISTRIBUTORS.length,
        regionCount: REGIONS.length,
        weekCount: weeks.length,
        rowCount: weekly.length,
      },
      regions: REGIONS,
      distributors: DISTRIBUTORS,
      skus: SKUS,
      weeks,
      weekly,
    }
  }
  return _cache
}

export function filterWeekly({ sku, distributor, region, category, weekFrom, weekTo } = {}) {
  const { weekly } = getDataset()
  return weekly.filter((r) => {
    if (sku && r.skuId !== sku) return false
    if (distributor && r.distributorId !== distributor) return false
    if (region && r.region !== region) return false
    if (category && r.category !== category) return false
    if (weekFrom && r.weekId < weekFrom) return false
    if (weekTo && r.weekId > weekTo) return false
    return true
  })
}

export function aggregate(rows, groupKey) {
  const map = new Map()
  for (const r of rows) {
    const k = r[groupKey]
    if (!map.has(k)) {
      map.set(k, {
        key: k,
        demand: 0, tertiary: 0, secondary: 0, primary: 0,
        retailStock: 0, distributorStock: 0,
        revenue: 0, gm: 0, rows: 0,
      })
    }
    const agg = map.get(k)
    agg.demand += r.demand
    agg.tertiary += r.tertiary
    agg.secondary += r.secondary
    agg.primary += r.primary
    agg.retailStock += r.retailStock
    agg.distributorStock += r.distributorStock
    agg.revenue += r.revenue
    agg.gm += r.gm
    agg.rows += 1
  }
  return Array.from(map.values()).map((a) => ({
    ...a,
    revenue: round(a.revenue, 2),
    gm: round(a.gm, 2),
  }))
}

export function kpis() {
  const { weekly, weeks } = getDataset()
  const lastWeek = weeks[weeks.length - 1].weekId
  const prevWeek = weeks[weeks.length - 2].weekId
  const last = weekly.filter((r) => r.weekId === lastWeek)
  const prev = weekly.filter((r) => r.weekId === prevWeek)
  const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0)

  const totalRevenue = round(sum(weekly, 'revenue'), 2)
  const totalGm = round(sum(weekly, 'gm'), 2)
  const demandLast = sum(last, 'demand')
  const demandPrev = sum(prev, 'demand')
  const change = demandPrev ? ((demandLast - demandPrev) / demandPrev) * 100 : 0

  return {
    totalRevenue,
    totalGm,
    gmPct: round((totalGm / totalRevenue) * 100, 1),
    totalDemand: sum(weekly, 'demand'),
    totalPrimary: sum(weekly, 'primary'),
    totalSecondary: sum(weekly, 'secondary'),
    demandWoW: round(change, 2),
    weeksCovered: weeks.length,
  }
}

// =======================================================================
// Order Suggestion Engine
// -----------------------------------------------------------------------
// For each SKU × distributor, compute what the distributor *should* order:
//   • currentStock      = last known distributor stock
//   • retailStock       = last known retail stock (dealer channel)
//   • weeklySecondary   = avg weekly secondary sales (distributor→retail)
//   • suggestedQty      = max(0, 4 weeks of cover − currentStock)
//   • dealerGap         = weeklySecondary − retailStock  (positive = shortage)
//   • scheme            = promotional offer (if any)
//   • leadTimeDays      = 3–5 days depending on distributor region
// =======================================================================
export function suggestOrders(distributorId) {
  const { weekly, distributors, skus, weeks } = getDataset()
  const dist = distributors.find((d) => d.id === distributorId)
  if (!dist) return { distributor: null, lines: [] }

  const leadTimeDays = dist.region === 'North' ? 3 : dist.region === 'South' ? 4 : 5
  const today = new Date()
  const eta = new Date(today.getTime() + leadTimeDays * 86400000).toISOString().slice(0, 10)
  const lastWeekId = weeks[weeks.length - 1]?.weekId

  const bySku = new Map()
  for (const r of weekly) {
    if (r.distributorId !== distributorId) continue
    if (!bySku.has(r.skuId)) bySku.set(r.skuId, [])
    bySku.get(r.skuId).push(r)
  }

  const skuMap = Object.fromEntries(skus.map((s) => [s.id, s]))

  // Compute network-wide weekly-avg secondary per SKU to flag "high demand"
  const overallAvg = new Map()
  for (const r of weekly) {
    if (!overallAvg.has(r.skuId)) overallAvg.set(r.skuId, { total: 0, n: 0 })
    const e = overallAvg.get(r.skuId)
    e.total += r.secondary
    e.n += 1
  }
  const avgList = [...overallAvg.values()].map((v) => v.total / v.n).sort((a, b) => b - a)
  const highDemandThreshold = avgList[Math.max(2, Math.floor(avgList.length * 0.25))] || 0

  const lines = []
  for (const [skuId, rows] of bySku.entries()) {
    rows.sort((a, b) => (a.weekId > b.weekId ? 1 : -1))
    const last = rows[rows.length - 1]
    const sku = skuMap[skuId]
    const weeklySecondary = rows.reduce((s, r) => s + r.secondary, 0) / rows.length
    const coverWeeks = 4
    const suggestedQty = Math.max(0, Math.round(weeklySecondary * coverWeeks - last.distributorStock))
    const dealerGap = Math.round(weeklySecondary - last.retailStock)
    const distAvgSecondary = rows.reduce((s, r) => s + r.secondary, 0) / rows.length
    const isHighDemand = distAvgSecondary >= highDemandThreshold / DISTRIBUTORS.length * 1.2

    // Deterministic scheme assignment (no randomness so UI is stable)
    let scheme = null
    if (sku.category === 'Smartphones - Yuva Series' && last.weekNumber >= 24 && last.weekNumber <= 34) {
      scheme = { label: 'Back-to-campus cashback 6%', discountPct: 6 }
    } else if (sku.category === 'Smartphones - Blaze Series' && last.weekNumber >= 40) {
      scheme = { label: 'Festive exchange bonus 5%', discountPct: 5 }
    } else if (sku.category === 'Accessories and Wearables' && isHighDemand) {
      scheme = { label: 'Bundle rebate 4%', discountPct: 4 }
    } else if (isHighDemand && suggestedQty > 0) {
      scheme = { label: 'Quick-ship priority', discountPct: 0 }
    }

    lines.push({
      skuId,
      skuName: sku.name,
      category: sku.category,
      price: last.price,
      cost: last.cost,
      currentStock: last.distributorStock,
      retailStock: last.retailStock,
      weeklySecondary: Math.round(weeklySecondary),
      lastSecondary: last.secondary,
      suggestedQty,
      coverWeeks,
      dealerGap,
      scheme,
      isHighDemand,
      estimatedValue: Math.round(suggestedQty * last.price * 100) / 100,
    })
  }

  lines.sort((a, b) => (b.isHighDemand - a.isHighDemand) || (b.suggestedQty - a.suggestedQty))

  return {
    distributor: dist,
    leadTimeDays,
    tentativeDeliveryDate: eta,
    lastWeekId,
    lines,
  }
}

// =======================================================================
// Dealer Activation Opportunity (Stocked vs Active dealers by SKU)
// -----------------------------------------------------------------------
// For each SKU under a distributor:
//   • registeredDealers = channel size for that distributor
//   • stockedDealers    = dealers estimated to currently hold stock
//   • activeDealers     = stocked dealers that sold/reordered last week
//   • gapDealers        = stockedDealers - activeDealers
// This powers a lightweight, client-demo "activation opportunity" view.
// =======================================================================
export function buildDealerActivationGap(distributorId) {
  const { weekly, distributors, skus, weeks } = getDataset()
  const distributor = distributors.find((d) => d.id === distributorId)
  if (!distributor) return { distributor: null, rows: [], summary: null }

  const tierBaseDealers = { A: 420, B: 300, C: 190 }
  const regionAdj = { North: 20, South: 10, West: 0 }
  const registeredDealers = (tierBaseDealers[distributor.tier] || 240) + (regionAdj[distributor.region] || 0)

  const lastWeekId = weeks[weeks.length - 1]?.weekId
  const last4Ids = weeks.slice(-4).map((w) => w.weekId)

  const rows = []
  for (const sku of skus) {
    const skuRows = weekly.filter((r) => r.distributorId === distributorId && r.skuId === sku.id)
    if (!skuRows.length) continue
    skuRows.sort((a, b) => (a.weekId > b.weekId ? 1 : -1))

    const last = skuRows[skuRows.length - 1]
    const last4Rows = skuRows.filter((r) => last4Ids.includes(r.weekId))
    const weeklySecondaryAvg = last4Rows.reduce((s, r) => s + r.secondary, 0) / Math.max(1, last4Rows.length)

    // Estimate how widely this SKU is stocked in the registered dealer base.
    const stockCoverFactor = last.retailStock / Math.max(1, weeklySecondaryAvg * 2.2)
    const stockNoise = stableUnit01(`${distributorId}|${sku.id}|stocked-v1`)
    const stockedRatio = Math.max(0.18, Math.min(0.94, 0.36 + stockCoverFactor * 0.26 + stockNoise * 0.1))
    const stockedDealers = Math.max(0, Math.min(registeredDealers, Math.round(registeredDealers * stockedRatio)))

    // Convert last-week secondary movement to active dealer count.
    const velocityNoise = stableUnit01(`${distributorId}|${sku.id}|velocity-v1`)
    const unitsPerActiveDealer = 2.5 + velocityNoise * 4.0
    let activeDealers = Math.round(last.secondary / unitsPerActiveDealer)
    activeDealers = Math.max(0, Math.min(stockedDealers, activeDealers))
    if (stockedDealers > 0 && last.secondary > 0) activeDealers = Math.max(1, activeDealers)

    const gapDealers = Math.max(0, stockedDealers - activeDealers)
    const activationPct = stockedDealers ? Math.round((activeDealers / stockedDealers) * 1000) / 10 : 0
    const potentialSecondaryUnits = Math.round(gapDealers * unitsPerActiveDealer)
    const potentialSecondaryValue = round(potentialSecondaryUnits * last.price, 2)

    rows.push({
      weekId: lastWeekId,
      distributorId,
      distributorName: distributor.name,
      skuId: sku.id,
      skuName: sku.name,
      category: sku.category,
      registeredDealers,
      stockedDealers,
      activeDealers,
      gapDealers,
      activationPct,
      potentialSecondaryUnits,
      potentialSecondaryValue,
    })
  }

  rows.sort((a, b) => b.gapDealers - a.gapDealers || a.activationPct - b.activationPct)

  const stockedDealers = rows.reduce((s, r) => s + r.stockedDealers, 0)
  const activeDealers = rows.reduce((s, r) => s + r.activeDealers, 0)
  const gapDealers = rows.reduce((s, r) => s + r.gapDealers, 0)
  const potentialSecondaryUnits = rows.reduce((s, r) => s + r.potentialSecondaryUnits, 0)
  const potentialSecondaryValue = round(rows.reduce((s, r) => s + r.potentialSecondaryValue, 0), 2)

  return {
    distributor,
    lastWeekId,
    rows,
    summary: {
      registeredDealers,
      skuCount: rows.length,
      stockedDealers,
      activeDealers,
      gapDealers,
      activationPct: stockedDealers ? Math.round((activeDealers / stockedDealers) * 1000) / 10 : 0,
      potentialSecondaryUnits,
      potentialSecondaryValue,
    },
  }
}

// =======================================================================
// Order vs Dispatch (execution gaps) — simulated fulfilment
// -----------------------------------------------------------------------
// Combines rule-based supply adequacy (last week primary ÷ secondary for
// the SKU × distributor) with a deterministic hash "jitter" so the demo
// stays stable but SKU lines differ. Tier nudges A/B/C service levels.
// =======================================================================

function stableUnit01(seed) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h % 10_000) / 10_000
}

/**
 * @param {string} distributorId
 * @param {{ skuId: string, orderedQty: number, skuName?: string }[]} orderedLines — only lines with orderedQty > 0 are used
 * @returns {Array<{ skuId: string, skuName: string, orderedQty: number, dispatchedQty: number, gap: number, status: string, fillRatePct: number }>}
 */
export function buildDispatchVisibilityRows(distributorId, orderedLines) {
  const dist = DISTRIBUTORS.find((d) => d.id === distributorId)
  const tierNudge = dist?.tier === 'A' ? 0.06 : dist?.tier === 'B' ? 0 : -0.07

  const { weekly, weeks } = getDataset()
  const lastWeekId = weeks[weeks.length - 1]?.weekId
  const skuMap = Object.fromEntries(SKUS.map((s) => [s.id, s]))

  const rows = []
  for (const line of orderedLines || []) {
    const orderedQty = Math.max(0, Math.round(Number(line.orderedQty) || 0))
    if (orderedQty <= 0) continue

    const skuId = line.skuId
    const lastRow = weekly.find(
      (r) => r.distributorId === distributorId && r.skuId === skuId && r.weekId === lastWeekId,
    )
    let ratio = 1
    if (lastRow && lastRow.secondary > 0) ratio = lastRow.primary / lastRow.secondary
    const ratioClamped = Math.max(0.5, Math.min(1.45, ratio))
    // Adequate primary → higher simulated fill; short primary → lower fill
    const fillFromSupply = 0.58 + 0.34 * ((ratioClamped - 0.5) / 0.95)
    const jitter = (stableUnit01(`${distributorId}|${skuId}|dispatch-v1`) - 0.5) * 0.14
    let fill = fillFromSupply + tierNudge + jitter
    fill = Math.max(0.28, Math.min(0.995, fill))

    let dispatchedQty = Math.round(orderedQty * fill)
    dispatchedQty = Math.max(0, Math.min(orderedQty, dispatchedQty))

    const gap = orderedQty - dispatchedQty
    let status = 'Partial'
    if (gap <= 0) status = 'Fully fulfilled'
    else if (dispatchedQty <= 0) status = 'Pending'
    else status = 'Partial'

    const skuName = line.skuName || skuMap[skuId]?.name || skuId
    rows.push({
      skuId,
      skuName,
      orderedQty,
      dispatchedQty,
      gap,
      status,
      fillRatePct: orderedQty ? Math.round((dispatchedQty / orderedQty) * 1000) / 10 : 0,
    })
  }

  rows.sort((a, b) => b.gap - a.gap || b.orderedQty - a.orderedQty)
  return rows
}
