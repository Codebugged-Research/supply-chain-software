// =======================================================================
// S&OP Demo – Central Dummy Data Module (FMCG style)
// -----------------------------------------------------------------------
// Generates a deterministic dataset used across every module:
//   • 15 SKUs  • 5 Distributors  • 3 Regions  • 26 weekly buckets (6 mo)
//
// The dataset is generated ONCE on first access and cached in module
// memory so all API responses are consistent within the process.
// =======================================================================

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

// ---- Master Data --------------------------------------------------------
export const REGIONS = [
  { id: 'REG-N', name: 'North', color: '#3b82f6' },
  { id: 'REG-S', name: 'South', color: '#10b981' },
  { id: 'REG-W', name: 'West', color: '#f59e0b' },
]

export const DISTRIBUTORS = [
  { id: 'DST-001', name: 'NorthStar Foods', region: 'North', tier: 'A' },
  { id: 'DST-002', name: 'Coastal Distribution Co', region: 'West', tier: 'A' },
  { id: 'DST-003', name: 'Midwest Supply Partners', region: 'North', tier: 'B' },
  { id: 'DST-004', name: 'Sunbelt Wholesale', region: 'South', tier: 'A' },
  { id: 'DST-005', name: 'Rockies Trading LLC', region: 'West', tier: 'C' },
]

// Each distributor gets a "size factor" that scales its volume
const DIST_FACTOR = { 'DST-001': 1.30, 'DST-002': 1.10, 'DST-003': 0.85, 'DST-004': 1.15, 'DST-005': 0.60 }

// 15 SKUs across 5 categories with realistic FMCG pricing
// seasonPeakWeek: week-of-year where demand peaks (for a sine seasonality)
// seasonAmp: amplitude of seasonality (0–1)
// growth: weekly growth rate
export const SKUS = [
  // Beverages – peak in summer
  { id: 'SKU-10842', name: 'Sparkling Water 500ml',      category: 'Beverages',     price: 1.49, cost: 0.62, baseWeekly: 4200, seasonPeakWeek: 28, seasonAmp: 0.35, growth: 0.004 },
  { id: 'SKU-10843', name: 'Cola Classic 330ml',         category: 'Beverages',     price: 0.99, cost: 0.38, baseWeekly: 5800, seasonPeakWeek: 30, seasonAmp: 0.30, growth: 0.002 },
  { id: 'SKU-10844', name: 'Cold Brew Coffee 1L',        category: 'Beverages',     price: 3.99, cost: 1.70, baseWeekly: 1200, seasonPeakWeek: 26, seasonAmp: 0.40, growth: 0.010 },
  { id: 'SKU-10845', name: 'Iced Tea Peach 500ml',       category: 'Beverages',     price: 1.79, cost: 0.70, baseWeekly: 2600, seasonPeakWeek: 30, seasonAmp: 0.45, growth: 0.005 },

  // Snacks – peak in late-year holidays
  { id: 'SKU-20591', name: 'Organic Granola 340g',       category: 'Snacks',        price: 4.49, cost: 1.90, baseWeekly: 1800, seasonPeakWeek: 48, seasonAmp: 0.25, growth: 0.006 },
  { id: 'SKU-20592', name: 'Salted Pretzels 200g',       category: 'Snacks',        price: 2.29, cost: 0.92, baseWeekly: 2400, seasonPeakWeek: 51, seasonAmp: 0.30, growth: 0.003 },
  { id: 'SKU-20593', name: 'Dark Choc Almonds 150g',     category: 'Snacks',        price: 5.49, cost: 2.40, baseWeekly: 1100, seasonPeakWeek: 51, seasonAmp: 0.35, growth: 0.008 },

  // Dairy – stable with slight winter bump
  { id: 'SKU-30220', name: 'Greek Yogurt Multipack 4x',  category: 'Dairy',         price: 4.99, cost: 2.20, baseWeekly: 2200, seasonPeakWeek: 10, seasonAmp: 0.15, growth: -0.001 },
  { id: 'SKU-30221', name: 'Whole Milk 2L',              category: 'Dairy',         price: 3.29, cost: 1.60, baseWeekly: 3100, seasonPeakWeek: 2,  seasonAmp: 0.12, growth: 0.001 },
  { id: 'SKU-30222', name: 'Aged Cheddar 250g',          category: 'Dairy',         price: 6.49, cost: 2.95, baseWeekly: 900,  seasonPeakWeek: 50, seasonAmp: 0.28, growth: 0.004 },

  // Frozen – dual peak (summer & winter)
  { id: 'SKU-40117', name: 'Frozen Berries 1kg',         category: 'Frozen',        price: 5.99, cost: 2.60, baseWeekly: 1400, seasonPeakWeek: 26, seasonAmp: 0.30, growth: 0.005 },
  { id: 'SKU-40118', name: 'Vanilla Ice Cream 1L',       category: 'Frozen',        price: 4.79, cost: 2.00, baseWeekly: 1700, seasonPeakWeek: 30, seasonAmp: 0.50, growth: 0.003 },
  { id: 'SKU-40119', name: 'Frozen Pizza Margherita',    category: 'Frozen',        price: 4.29, cost: 1.80, baseWeekly: 1500, seasonPeakWeek: 4,  seasonAmp: 0.25, growth: 0.002 },

  // Personal Care – stable, steady growth
  { id: 'SKU-50803', name: 'Bar Soap 3-pack',            category: 'Personal Care', price: 3.99, cost: 1.50, baseWeekly: 1300, seasonPeakWeek: 20, seasonAmp: 0.10, growth: 0.003 },
  { id: 'SKU-50804', name: 'Shampoo 400ml',              category: 'Personal Care', price: 5.29, cost: 2.10, baseWeekly: 1000, seasonPeakWeek: 15, seasonAmp: 0.10, growth: 0.004 },
]

// ---- Week axis: 26 most-recent weeks ending at "today" ------------------
function buildWeeks(count = 26, anchor = new Date('2025-08-10')) {
  const weeks = []
  // Normalize anchor to start-of-week (Monday)
  const d = new Date(anchor)
  const day = d.getUTCDay() || 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(d)
    start.setUTCDate(d.getUTCDate() - i * 7)
    // ISO week number (approx)
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

// ---- Core generator ----------------------------------------------------
function seasonality(weekOfYear, peak, amp) {
  // Cosine peaking at `peak`, trough at peak+26
  const phase = ((weekOfYear - peak) / 52) * 2 * Math.PI
  return 1 + amp * Math.cos(phase)
}

function generateDataset() {
  const weeks = buildWeeks(26)
  const weekly = []

  // Each (SKU, Distributor, Week) gets a row. Regions are inherited
  // from the distributor so the fact table is clean.
  for (const sku of SKUS) {
    for (const dist of DISTRIBUTORS) {
      // Per distributor channel inventory state (simulated)
      let distStock = sku.baseWeekly * DIST_FACTOR[dist.id] * rnd(1.8, 2.4)
      let retailStock = sku.baseWeekly * DIST_FACTOR[dist.id] * rnd(0.6, 1.1)

      weeks.forEach((w, idx) => {
        const seas = seasonality(w.weekNumber, sku.seasonPeakWeek, sku.seasonAmp)
        const trend = 1 + sku.growth * idx
        const noise = rnd(0.88, 1.12)

        // Tertiary demand (consumer sell-out)
        const tertiary = Math.max(0, Math.round(
          sku.baseWeekly * DIST_FACTOR[dist.id] * seas * trend * noise / 4 // /4 → weekly per-distributor share
        ))

        // Secondary sales (distributor → retail) tracks tertiary with slight overshoot and noise
        const secondary = Math.max(0, Math.round(tertiary * rnd(1.00, 1.15)))

        // Primary sales (factory → distributor) orders in chunks, more volatile
        const primary = Math.max(0, Math.round(secondary * rnd(0.85, 1.35)))

        // Update channel inventories: primary adds to distStock, secondary removes
        distStock = Math.max(0, distStock + primary - secondary)
        retailStock = Math.max(0, retailStock + secondary - tertiary)

        // Price and cost wiggle slightly over time (promo weeks)
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
          demand: tertiary,          // tertiary
          tertiary,
          secondary,
          primary,
          retailStock: Math.round(retailStock),
          distributorStock: Math.round(distStock),
          price,
          cost,
          revenue: round(price * secondary, 2),  // manufacturer→distributor revenue uses secondary as proxy
          gm: round((price - cost) * secondary, 2),
        })
      })
    }
  }

  return { weeks, weekly }
}

// ---- Module-level cache -------------------------------------------------
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

// ---- Aggregation helpers (used by API endpoints) -----------------------
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
