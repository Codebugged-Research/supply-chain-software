// =======================================================================
// S&OP Demo – Central Dummy Data Module (boAt audio & wearables portfolio)
// -----------------------------------------------------------------------
// Generates a deterministic dataset used across every module:
//   • 21 selling SKUs  • 4 pre-launch NPIs  • 8 Distributors  • 6 Regions
//   • 26 operational weekly buckets backed by a 157-week planning calendar
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
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const DATA_VERSION = 'DM-2026-W33-V1'
const GENERATION_SEED = 20250701
const ANCHOR_MONDAY = new Date('2026-08-10T00:00:00.000Z')
const GENERATED_AT = '2026-08-10T00:00:00.000Z'

export const XYZ_CV_THRESHOLDS = Object.freeze({ X_MAX: 0.25, Y_MAX: 0.5 })

// XYZ variability is a SKU-week property, so it must be correlated across
// distributors. Independent distributor noise is diversified away when the
// Inventory Planning API aggregates the distributor channels into one SKU-week.
const SKU_DEMAND_VARIABILITY = {
  'SKU-BOAT-AD141': 'STABLE',
  'SKU-BOAT-AD131': 'STABLE',
  'SKU-BOAT-RZ255': 'STABLE',
  'SKU-BOAT-RZ245': 'STABLE',
  'SKU-BOAT-BH100': 'STABLE',
  'SKU-BOAT-BH225': 'STABLE',
  'SKU-BOAT-IM201': 'STABLE',
  'SKU-BOAT-AD161P': 'VARIABLE',
  'SKU-BOAT-RZ330': 'VARIABLE',
  'SKU-BOAT-WC100': 'VARIABLE',
  'SKU-BOAT-LD100': 'VARIABLE',
  'SKU-BOAT-ST350': 'VARIABLE',
  'SKU-BOAT-XT200': 'INTERMITTENT',
  'SKU-BOAT-ST1508': 'INTERMITTENT',
  'SKU-BOAT-PP20': 'INTERMITTENT',
  'SKU-BOAT-ADALPHA': 'STABLE',
  'SKU-BOAT-NI100': 'VARIABLE',
  'SKU-BOAT-RZ450': 'STABLE',
  'SKU-BOAT-N751': 'VARIABLE',
  'SKU-BOAT-LE100': 'VARIABLE',
  'SKU-BOAT-AV2400': 'INTERMITTENT',
}

const FORECAST_METHOD_BY_STAGE = {
  NEW: 'NPI_RAMP',
  GROWTH: 'TREND_EVENT',
  MATURE: 'SEASONAL_BASELINE',
  DECLINE: 'RAMP_DOWN',
  EOL: 'EOL_CLEARANCE',
}

const SKU_LIFECYCLE = {
  'SKU-BOAT-AD141': { lifecycleStage: 'GROWTH', lifecycleStageSinceWeek: '2026-W14', launchWeek: '2025-W39' },
  'SKU-BOAT-AD131': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W35', launchWeek: '2023-W38' },
  'SKU-BOAT-AD161P': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2026-W01', launchWeek: '2024-W42' },
  'SKU-BOAT-RZ255': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W20', launchWeek: '2023-W18' },
  'SKU-BOAT-RZ245': { lifecycleStage: 'DECLINE', lifecycleStageSinceWeek: '2026-W09', launchWeek: '2022-W31' },
  'SKU-BOAT-RZ330': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W48', launchWeek: '2024-W27' },
  'SKU-BOAT-WC100': { lifecycleStage: 'GROWTH', lifecycleStageSinceWeek: '2026-W11', launchWeek: '2025-W44' },
  'SKU-BOAT-LD100': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2026-W06', launchWeek: '2025-W32' },
  'SKU-BOAT-XT200': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W36', launchWeek: '2024-W35' },
  'SKU-BOAT-ST350': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W22', launchWeek: '2023-W41' },
  'SKU-BOAT-ST1508': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W51', launchWeek: '2024-W46' },
  'SKU-BOAT-PP20': { lifecycleStage: 'EOL', lifecycleStageSinceWeek: '2026-W18', launchWeek: '2022-W45', discontinueWeek: '2026-W34', replacementSkuId: 'SKU-BOAT-NPI-STI750' },
  'SKU-BOAT-BH100': { lifecycleStage: 'DECLINE', lifecycleStageSinceWeek: '2025-W45', launchWeek: '2021-W30' },
  'SKU-BOAT-BH225': { lifecycleStage: 'DECLINE', lifecycleStageSinceWeek: '2026-W04', launchWeek: '2022-W12' },
  'SKU-BOAT-IM201': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W40', launchWeek: '2024-W25' },
  'SKU-BOAT-ADALPHA': { lifecycleStage: 'GROWTH', lifecycleStageSinceWeek: '2026-W08', launchWeek: '2025-W46' },
  'SKU-BOAT-NI100': { lifecycleStage: 'GROWTH', lifecycleStageSinceWeek: '2026-W12', launchWeek: '2025-W49' },
  'SKU-BOAT-RZ450': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W28', launchWeek: '2023-W12' },
  'SKU-BOAT-N751': { lifecycleStage: 'GROWTH', lifecycleStageSinceWeek: '2026-W10', launchWeek: '2025-W42' },
  'SKU-BOAT-LE100': { lifecycleStage: 'GROWTH', lifecycleStageSinceWeek: '2026-W05', launchWeek: '2025-W36' },
  'SKU-BOAT-AV2400': { lifecycleStage: 'MATURE', lifecycleStageSinceWeek: '2025-W32', launchWeek: '2024-W18' },
}

// ---- Master Data --------------------------------------------------------
export const REGIONS = [
  { id: 'REG-N', name: 'North', color: '#3b82f6' },
  { id: 'REG-S', name: 'South', color: '#10b981' },
  { id: 'REG-W', name: 'West', color: '#f59e0b' },
  { id: 'REG-E', name: 'East', color: '#8b5cf6' },
  { id: 'REG-C', name: 'Central', color: '#ef4444' },
  { id: 'REG-NE', name: 'Northeast', color: '#06b6d4' },
]

export const DISTRIBUTORS = [
  { id: 'DST-001', name: 'boAt North Distribution Hub', region: 'North', regionId: 'REG-N', headquartersCity: 'Delhi', primaryStates: ['Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh'], coverageType: 'REGIONAL', tier: 'A' },
  { id: 'DST-002', name: 'Western India Audio Channel Partners', region: 'West', regionId: 'REG-W', headquartersCity: 'Mumbai', primaryStates: ['Maharashtra', 'Goa', 'Gujarat'], coverageType: 'REGIONAL', tier: 'A' },
  { id: 'DST-003', name: 'Northland Electronics Distributors', region: 'North', regionId: 'REG-N', headquartersCity: 'Jaipur', primaryStates: ['Rajasthan', 'Uttarakhand', 'Himachal Pradesh'], coverageType: 'REGIONAL', tier: 'B' },
  { id: 'DST-004', name: 'South India Digital Retail Network', region: 'South', regionId: 'REG-S', headquartersCity: 'Bengaluru', primaryStates: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Telangana', 'Andhra Pradesh'], coverageType: 'REGIONAL', tier: 'A' },
  { id: 'DST-005', name: 'West Bharat Consumer Electronics Traders', region: 'West', regionId: 'REG-W', headquartersCity: 'Ahmedabad', primaryStates: ['Gujarat', 'Maharashtra'], coverageType: 'REGIONAL', tier: 'C' },
  { id: 'DST-006', name: 'East India Consumer Tech Network', region: 'East', regionId: 'REG-E', headquartersCity: 'Kolkata', primaryStates: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand'], coverageType: 'REGIONAL', tier: 'A' },
  { id: 'DST-007', name: 'Central Bharat Retail Distribution', region: 'Central', regionId: 'REG-C', headquartersCity: 'Nagpur', primaryStates: ['Madhya Pradesh', 'Chhattisgarh', 'Vidarbha'], coverageType: 'REGIONAL', tier: 'B' },
  { id: 'DST-008', name: 'Northeast Digital Trade Network', region: 'Northeast', regionId: 'REG-NE', headquartersCity: 'Guwahati', primaryStates: ['Assam', 'Meghalaya', 'Manipur', 'Nagaland', 'Tripura', 'Mizoram', 'Arunachal Pradesh', 'Sikkim'], coverageType: 'REGIONAL', tier: 'B' },
]

const DIST_FACTOR = { 'DST-001': 1.30, 'DST-002': 1.10, 'DST-003': 0.85, 'DST-004': 1.15, 'DST-005': 0.60, 'DST-006': 0.92, 'DST-007': 0.72, 'DST-008': 0.48 }

// SKU codes reuse the SKU-BOAT-* convention from the Supply Planning module
// (product_master) so the two systems share identifiable product identity.
export const SKUS = [
  { id: 'SKU-BOAT-AD141',  name: 'boAt Airdopes 141',           category: 'TWS Earbuds',       price: toInrListPrice(1299), cost: toInrListPrice(480),  baseWeekly: 1400, seasonPeakWeek: 44, seasonAmp: 0.28, growth: 0.008 },
  { id: 'SKU-BOAT-AD131',  name: 'boAt Airdopes 131',           category: 'TWS Earbuds',       price: toInrListPrice(1299), cost: toInrListPrice(820),  baseWeekly: 1600, seasonPeakWeek: 43, seasonAmp: 0.24, growth: 0.005 },
  { id: 'SKU-BOAT-AD161P', name: 'boAt Airdopes 161 Pro',       category: 'TWS Earbuds',       price: toInrListPrice(1999), cost: toInrListPrice(1300), baseWeekly: 900,  seasonPeakWeek: 45, seasonAmp: 0.32, growth: 0.012 },
  { id: 'SKU-BOAT-RZ255',  name: 'boAt Rockerz 255 Pro+',       category: 'Neckbands',         price: toInrListPrice(1299), cost: toInrListPrice(800),  baseWeekly: 1100, seasonPeakWeek: 30, seasonAmp: 0.22, growth: 0.004 },
  { id: 'SKU-BOAT-RZ245',  name: 'boAt Rockerz 245v2',          category: 'Neckbands',         price: toInrListPrice(999),  cost: toInrListPrice(620),  baseWeekly: 1350, seasonPeakWeek: 29, seasonAmp: 0.20, growth: 0.002 },
  { id: 'SKU-BOAT-RZ330',  name: 'boAt Rockerz 330 Pro',        category: 'Neckbands',         price: toInrListPrice(1499), cost: toInrListPrice(950),  baseWeekly: 700,  seasonPeakWeek: 31, seasonAmp: 0.25, growth: 0.007 },
  { id: 'SKU-BOAT-WC100',  name: 'boAt Wave Connect',           category: 'Smartwatches',      price: toInrListPrice(1799), cost: toInrListPrice(1150), baseWeekly: 850,  seasonPeakWeek: 45, seasonAmp: 0.30, growth: 0.015 },
  { id: 'SKU-BOAT-LD100',  name: 'boAt Lunar Discovery',        category: 'Smartwatches',      price: toInrListPrice(1799), cost: toInrListPrice(720),  baseWeekly: 420,  seasonPeakWeek: 46, seasonAmp: 0.34, growth: 0.018 },
  { id: 'SKU-BOAT-XT200',  name: 'boAt Xtend',                  category: 'Smartwatches',      price: toInrListPrice(3299), cost: toInrListPrice(2150), baseWeekly: 300,  seasonPeakWeek: 44, seasonAmp: 0.30, growth: 0.010 },
  { id: 'SKU-BOAT-ST350',  name: 'boAt Stone 350',              category: 'Portable Speakers', price: toInrListPrice(1499), cost: toInrListPrice(580),  baseWeekly: 380,  seasonPeakWeek: 47, seasonAmp: 0.36, growth: 0.009 },
  { id: 'SKU-BOAT-ST1508', name: 'boAt Stone 1508',             category: 'Portable Speakers', price: toInrListPrice(5999), cost: toInrListPrice(3900), baseWeekly: 150,  seasonPeakWeek: 48, seasonAmp: 0.40, growth: 0.006 },
  { id: 'SKU-BOAT-PP20',   name: 'boAt Party Pal 20',           category: 'Portable Speakers', price: toInrListPrice(8999), cost: toInrListPrice(5900), baseWeekly: 70,   seasonPeakWeek: 49, seasonAmp: 0.45, growth: 0.011 },
  { id: 'SKU-BOAT-BH100',  name: 'boAt Bassheads 100',          category: 'Wired Audio',       price: toInrListPrice(399),  cost: toInrListPrice(240),  baseWeekly: 2200, seasonPeakWeek: 20, seasonAmp: 0.14, growth: -0.002 },
  { id: 'SKU-BOAT-BH225',  name: 'boAt Bassheads 225',          category: 'Wired Audio',       price: toInrListPrice(599),  cost: toInrListPrice(360),  baseWeekly: 1500, seasonPeakWeek: 22, seasonAmp: 0.16, growth: -0.001 },
  { id: 'SKU-BOAT-IM201',  name: 'boAt Immortal IM 201',        category: 'Wired Audio',       price: toInrListPrice(699),  cost: toInrListPrice(430),  baseWeekly: 950,  seasonPeakWeek: 25, seasonAmp: 0.18, growth: 0.003 },
  { id: 'SKU-BOAT-ADALPHA', name: 'boAt Airdopes Alpha',        category: 'TWS Earbuds',         price: toInrListPrice(899),  cost: toInrListPrice(340),  baseWeekly: 1750, seasonPeakWeek: 44, seasonAmp: 0.26, growth: 0.011 },
  { id: 'SKU-BOAT-NI100',   name: 'boAt Nirvana Ion',           category: 'TWS Earbuds',         price: toInrListPrice(2499), cost: toInrListPrice(1120), baseWeekly: 620, seasonPeakWeek: 45, seasonAmp: 0.34, growth: 0.014 },
  { id: 'SKU-BOAT-RZ450',   name: 'boAt Rockerz 450',           category: 'Wireless Headphones', price: toInrListPrice(1499), cost: toInrListPrice(690), baseWeekly: 780, seasonPeakWeek: 44, seasonAmp: 0.27, growth: 0.004 },
  { id: 'SKU-BOAT-N751',    name: 'boAt Nirvana 751 ANC',       category: 'Wireless Headphones', price: toInrListPrice(3999), cost: toInrListPrice(1880), baseWeekly: 260, seasonPeakWeek: 46, seasonAmp: 0.38, growth: 0.012 },
  { id: 'SKU-BOAT-LE100',   name: 'boAt Lunar Embrace',         category: 'Smartwatches',        price: toInrListPrice(4999), cost: toInrListPrice(2320), baseWeekly: 210, seasonPeakWeek: 46, seasonAmp: 0.38, growth: 0.016 },
  { id: 'SKU-BOAT-AV2400',  name: 'boAt Aavante Bar 2400',      category: 'Soundbars',            price: toInrListPrice(7999), cost: toInrListPrice(4180), baseWeekly: 95, seasonPeakWeek: 45, seasonAmp: 0.43, growth: 0.007 },
].map((sku) => {
  const lifecycle = SKU_LIFECYCLE[sku.id]
  return {
    ...sku,
    ...lifecycle,
    hasSalesHistory: true,
    forecastMethod: FORECAST_METHOD_BY_STAGE[lifecycle.lifecycleStage],
    analogSkuIds: [],
    expectedStageEndWeek: lifecycle.lifecycleStage === 'GROWTH' ? '2027-W13' : null,
    replacementSkuId: lifecycle.replacementSkuId || null,
    discontinueWeek: lifecycle.discontinueWeek || null,
    effectiveFromWeek: lifecycle.lifecycleStageSinceWeek,
    effectiveToWeek: null,
    version: 1,
    status: lifecycle.lifecycleStage === 'EOL' ? 'DISCONTINUING' : 'ACTIVE',
    currency: 'INR',
    dataVersion: DATA_VERSION,
    generationSeed: GENERATION_SEED,
  }
})

function buildWeekRecord(start) {
  const jan1 = new Date(Date.UTC(start.getUTCFullYear(), 0, 1))
  const dayOfYear = Math.floor((start - jan1) / 86400000) + 1
  const weekNum = Math.ceil((dayOfYear + ((jan1.getUTCDay() || 7) - 1)) / 7)
  return {
    weekId: `${start.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`,
    weekNumber: weekNum,
    year: start.getUTCFullYear(),
    weekStart: start.toISOString().slice(0, 10),
    label: `W${String(weekNum).padStart(2, '0')}`,
  }
}

function buildWeeks(count = 26, anchor = ANCHOR_MONDAY) {
  const weeks = []
  const d = new Date(anchor)
  const day = d.getUTCDay() || 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1))

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(d)
    start.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(buildWeekRecord(start))
  }
  return weeks
}

function buildPlanningWeeks(historyWeeks = 104, futureWeeks = 52) {
  const weeks = []
  for (let weekIndex = -historyWeeks; weekIndex <= futureWeeks; weekIndex++) {
    const start = new Date(ANCHOR_MONDAY)
    start.setUTCDate(ANCHOR_MONDAY.getUTCDate() + weekIndex * 7)
    weeks.push({
      ...buildWeekRecord(start),
      weekIndex,
      isClosed: weekIndex < 0,
      isAnchor: weekIndex === 0,
      isDefault26WeekView: weekIndex >= -25 && weekIndex <= 0,
      calendarVersionId: 'CAL-2026-W33-V1',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    })
  }
  return weeks
}

function seasonality(weekOfYear, peak, amp) {
  const phase = ((weekOfYear - peak) / 52) * 2 * Math.PI
  return 1 + amp * Math.cos(phase)
}

function stableSigned(seed, amplitude) {
  return (2 * stableUnit01(seed) - 1) * amplitude
}

function skuWeekVariabilityFactor(skuId, weekId) {
  const profile = SKU_DEMAND_VARIABILITY[skuId] || 'STABLE'
  const key = `demand-variability|${skuId}|${weekId}`
  if (profile === 'VARIABLE') {
    // Correlated launches, promotions and channel replenishment waves.
    return clamp(1 + stableSigned(key, 0.62), 0.32, 1.68)
  }
  if (profile === 'INTERMITTENT') {
    // Low-velocity/EOL lines have no-sale weeks and occasional bulk orders.
    const state = stableUnit01(`${key}|state`)
    if (state < 0.3) return 0.04
    if (state > 0.82) return 1.8 + stableUnit01(`${key}|burst`) * 0.9
    return 0.55 + stableUnit01(`${key}|regular`) * 0.75
  }
  return 1 + stableSigned(key, 0.08)
}

function lifecycleTrend(sku, weekIndex, weekCount) {
  switch (sku.lifecycleStage) {
    case 'GROWTH':
      return 1 + Math.max(0.006, Math.abs(sku.growth)) * weekIndex
    case 'DECLINE':
      return Math.max(0.55, 1 - (0.008 + 0.004 * stableUnit01(`plc|${sku.id}|decline`)) * weekIndex)
    case 'EOL':
      return Math.max(0, 1 - weekIndex / Math.max(1, weekCount * 0.8))
    case 'MATURE':
    default:
      return 1 + clamp(sku.growth, -0.002, 0.003) * weekIndex
  }
}

export const NPI_PRODUCTS = [
  {
    npiId: 'NPI-BOAT-NOVA-181', skuId: 'SKU-BOAT-NPI-NOVA181', skuName: 'boAt Airdopes Nova 181', productName: 'boAt Airdopes Nova 181',
    category: 'TWS Earbuds', subCategory: 'True Wireless Stereo', launchWeek: '2026-W38', rampWeeks: 12, rampCurve: 'S_CURVE',
    analogSkuIds: ['SKU-BOAT-AD141', 'SKU-BOAT-AD161P', 'SKU-BOAT-AD131'], targetPeakWeeklyUnits: 7200,
    mrpPaise: 249900, plannedNetPricePaise: 179900, unitCostPaise: 78000, readinessRate: 0.75,
    cannibalizedSkuIds: ['SKU-BOAT-AD131'], cannibalizationRate: 0.12,
  },
  {
    npiId: 'NPI-BOAT-APEX-300', skuId: 'SKU-BOAT-NPI-APEX300', skuName: 'boAt Rockerz Apex 300', productName: 'boAt Rockerz Apex 300',
    category: 'Neckbands', subCategory: 'Wireless Neckband', launchWeek: '2026-W40', rampWeeks: 10, rampCurve: 'LINEAR',
    analogSkuIds: ['SKU-BOAT-RZ255', 'SKU-BOAT-RZ330', 'SKU-BOAT-RZ245'], targetPeakWeeklyUnits: 4800,
    mrpPaise: 199900, plannedNetPricePaise: 139900, unitCostPaise: 69000, readinessRate: 0.625,
    cannibalizedSkuIds: ['SKU-BOAT-RZ245'], cannibalizationRate: 0.09,
  },
  {
    npiId: 'NPI-BOAT-IGNITE-750', skuId: 'SKU-BOAT-NPI-STI750', skuName: 'boAt Stone Ignite 750', productName: 'boAt Stone Ignite 750',
    category: 'Portable Speakers', subCategory: 'Portable Bluetooth Speaker', launchWeek: '2026-W42', rampWeeks: 12, rampCurve: 'HOCKEY_STICK',
    analogSkuIds: ['SKU-BOAT-ST350', 'SKU-BOAT-ST1508', 'SKU-BOAT-PP20'], targetPeakWeeklyUnits: 2400,
    mrpPaise: 499900, plannedNetPricePaise: 349900, unitCostPaise: 168000, readinessRate: 0.5,
    cannibalizedSkuIds: ['SKU-BOAT-PP20'], cannibalizationRate: 0.18,
  },
  {
    npiId: 'NPI-BOAT-VISTA-PRO', skuId: 'SKU-BOAT-NPI-LVP', skuName: 'boAt Lunar Vista Pro', productName: 'boAt Lunar Vista Pro',
    category: 'Smartwatches', subCategory: 'Bluetooth Calling Smartwatch', launchWeek: '2026-W45', rampWeeks: 12, rampCurve: 'S_CURVE',
    analogSkuIds: ['SKU-BOAT-WC100', 'SKU-BOAT-LD100', 'SKU-BOAT-XT200'], targetPeakWeeklyUnits: 3200,
    mrpPaise: 599900, plannedNetPricePaise: 399900, unitCostPaise: 184000, readinessRate: 0.875,
    cannibalizedSkuIds: ['SKU-BOAT-XT200'], cannibalizationRate: 0.1,
  },
].map((row) => ({
  ...row,
  curveTemplate: row.rampCurve,
  analogSkuId: row.analogSkuIds[0],
  peakWeeklyUnits: row.targetPeakWeeklyUnits,
  readinessPct: Math.round(row.readinessRate * 100),
  cannibalizationRatePct: Math.round(row.cannibalizationRate * 100),
  currency: 'INR',
  lifecycleStage: 'NEW',
  stage: 'NPI',
  hasSalesHistory: false,
  forecastMethod: FORECAST_METHOD_BY_STAGE.NEW,
  status: 'PLANNED',
  ownerUserId: 'npi.manager@boat.com',
  effectiveFromWeek: '2026-W33',
  effectiveToWeek: null,
  version: 1,
  createdAt: GENERATED_AT,
  updatedAt: GENERATED_AT,
  updatedBy: 'system.seed',
  source: 'SEED',
  dataVersion: DATA_VERSION,
  generationSeed: GENERATION_SEED,
}))

export const EVENT_TEMPLATES = [
  ['EVT-TPL-REPUBLIC', 'Republic Day Audio Sale', 'FESTIVAL', 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=26', 1, 0.18, 'TRIANGULAR', 'NATIONAL_SALE', 0.42],
  ['EVT-TPL-HOLI', 'Holi Colour & Sound Sale', 'FESTIVAL', 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=4', 2, 0.14, 'TRIANGULAR', 'SPRING_FESTIVE', 0.28],
  ['EVT-TPL-IPL', 'IPL Entertainment Season', 'SPORTS_CAMPAIGN', 'FREQ=YEARLY;BYWEEKNO=13', 10, 0.1, 'FLAT', 'SPORTS_SEASON', 0.18],
  ['EVT-TPL-SUMMER', 'Summer Audio Days', 'TRADE_CAMPAIGN', 'FREQ=YEARLY;BYMONTH=5', 2, 0.12, 'FLAT', 'SEASONAL', 0.3],
  ['EVT-TPL-PRIME', 'E-commerce Prime Days', 'PROMOTIONAL', 'FREQ=YEARLY;BYMONTH=7', 2, 0.24, 'TRIANGULAR', 'MARKETPLACE', 0.45],
  ['EVT-TPL-INDEPENDENCE', 'Independence Day Sale', 'FESTIVAL', 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=15', 2, 0.2, 'TRIANGULAR', 'NATIONAL_SALE', 0.42],
  ['EVT-TPL-FESTIVE', 'Festive Marketplace Sale', 'PROMOTIONAL', 'FREQ=YEARLY;BYWEEKNO=40', 3, 0.3, 'TRIANGULAR', 'MARKETPLACE', 0.5],
  ['EVT-TPL-NAVRATRI', 'Navratri and Dussehra Campaign', 'FESTIVAL', 'FREQ=YEARLY;BYWEEKNO=42', 3, 0.22, 'TRIANGULAR', 'FESTIVE', 0.48],
  ['EVT-TPL-DIWALI', 'Diwali Audio Festival', 'FESTIVAL', 'FREQ=YEARLY;BYWEEKNO=45', 3, 0.34, 'TRIANGULAR', 'FESTIVE', 0.48],
  ['EVT-TPL-YEAREND', 'Year-end Gifting', 'TRADE_CAMPAIGN', 'FREQ=YEARLY;BYWEEKNO=51', 2, 0.16, 'FLAT', 'SEASONAL', 0.3],
].map(([eventTemplateId, name, eventType, recurrenceRule, defaultDurationWeeks, defaultUpliftPct, upliftShape, stackingGroup, maxStackedUpliftPct]) => ({
  eventTemplateId,
  name,
  eventType,
  recurrenceRule,
  defaultLeadWeeks: 6,
  defaultDurationWeeks,
  defaultScope: 'PORTFOLIO',
  defaultUpliftPct,
  upliftShape,
  stackingGroup,
  maxStackedUpliftPct,
  active: true,
  effectiveFromWeek: '2026-W01',
  effectiveToWeek: null,
  version: 1,
  status: 'ACTIVE',
  createdAt: GENERATED_AT,
  updatedAt: GENERATED_AT,
  source: 'SEED',
  dataVersion: DATA_VERSION,
  generationSeed: GENERATION_SEED,
}))

const EVENT_SEEDS = [
  { eventId: 'EVT-2026-REPUBLIC', eventTemplateId: 'EVT-TPL-REPUBLIC', eventName: 'Republic Day Audio Sale 2026', startWeek: '2026-W03', endWeek: '2026-W04', categories: [], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.18, priceDiscountRate: 0.08 },
  { eventId: 'EVT-2026-HOLI', eventTemplateId: 'EVT-TPL-HOLI', eventName: 'Holi Colour & Sound Sale 2026', startWeek: '2026-W09', endWeek: '2026-W10', categories: ['TWS Earbuds', 'Portable Speakers', 'Smartwatches'], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.14, priceDiscountRate: 0.06 },
  { eventId: 'EVT-2026-IPL', eventTemplateId: 'EVT-TPL-IPL', eventName: 'IPL Entertainment Season 2026', startWeek: '2026-W13', endWeek: '2026-W22', categories: ['TWS Earbuds', 'Wireless Headphones', 'Portable Speakers', 'Soundbars', 'Smartwatches'], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.1, priceDiscountRate: 0.04 },
  { eventId: 'EVT-2026-SUMMER', eventTemplateId: 'EVT-TPL-SUMMER', eventName: 'Summer Audio Days 2026', startWeek: '2026-W19', endWeek: '2026-W20', categories: ['TWS Earbuds', 'Neckbands', 'Wireless Headphones', 'Portable Speakers'], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.12, priceDiscountRate: 0.05 },
  { eventId: 'EVT-2026-PRIME', eventTemplateId: 'EVT-TPL-PRIME', eventName: 'E-commerce Prime Days 2026', startWeek: '2026-W27', endWeek: '2026-W28', categories: [], affectedSkus: ['SKU-BOAT-AD141', 'SKU-BOAT-AD161P', 'SKU-BOAT-NI100', 'SKU-BOAT-WC100'], affectedChannels: ['DST-002', 'DST-004'], regionIds: [], upliftPct: 0.24, priceDiscountRate: 0.1 },
  { eventId: 'EVT-2026-INDEPENDENCE', eventTemplateId: 'EVT-TPL-INDEPENDENCE', eventName: 'Independence Day Sale 2026', startWeek: '2026-W32', endWeek: '2026-W33', categories: [], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.2, priceDiscountRate: 0.07 },
  { eventId: 'EVT-2026-FESTIVE-MKT', eventTemplateId: 'EVT-TPL-FESTIVE', eventName: 'Festive Marketplace Sale 2026', startWeek: '2026-W40', endWeek: '2026-W42', categories: [], affectedSkus: [], affectedChannels: ['DST-002', 'DST-004'], regionIds: [], upliftPct: 0.3, priceDiscountRate: 0.12 },
  { eventId: 'EVT-2026-NAVRATRI', eventTemplateId: 'EVT-TPL-NAVRATRI', eventName: 'Navratri and Dussehra Campaign 2026', startWeek: '2026-W42', endWeek: '2026-W44', categories: ['TWS Earbuds', 'Smartwatches', 'Portable Speakers'], affectedSkus: [], affectedChannels: [], regionIds: ['REG-N', 'REG-W'], upliftPct: 0.22, priceDiscountRate: 0.08 },
  { eventId: 'EVT-2026-DIWALI', eventTemplateId: 'EVT-TPL-DIWALI', eventName: 'Diwali Audio Festival 2026', startWeek: '2026-W45', endWeek: '2026-W47', categories: [], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.34, priceDiscountRate: 0.12 },
  { eventId: 'EVT-2026-YEAREND', eventTemplateId: 'EVT-TPL-YEAREND', eventName: 'Year-end Gifting 2026', startWeek: '2026-W51', endWeek: '2026-W52', categories: ['TWS Earbuds', 'Smartwatches', 'Portable Speakers'], affectedSkus: [], affectedChannels: [], regionIds: [], upliftPct: 0.16, priceDiscountRate: 0.06 },
]

export const DEMAND_EVENTS = EVENT_SEEDS.map((row) => {
  const template = EVENT_TEMPLATES.find((item) => item.eventTemplateId === row.eventTemplateId)
  const status = row.endWeek < '2026-W33' ? 'COMPLETED' : row.startWeek <= '2026-W33' ? 'ACTIVE' : 'PLANNED'
  return {
    ...row,
    name: row.eventName,
    eventType: template.eventType,
    status,
    skuIds: row.affectedSkus,
    channelIds: row.affectedChannels,
    upliftPercent: Math.round(row.upliftPct * 100),
    upliftShape: template.upliftShape,
    stackingGroup: template.stackingGroup,
    maxStackedUpliftPct: template.maxStackedUpliftPct,
    fundingSchemeId: null,
    ownerUserId: 'category.manager@boat.com',
    approvedBy: 'sop.lead@boat.com',
    notes: 'Deterministic synthetic calendar seed; editable through the demand event API.',
    actualUpliftPercent: status === 'COMPLETED' ? round(row.upliftPct * (0.92 + 0.12 * stableUnit01(`event-actual|${row.eventId}`)) * 100, 1) : null,
    effectiveFromWeek: row.startWeek,
    effectiveToWeek: row.endWeek,
    version: 1,
    createdAt: GENERATED_AT,
    updatedAt: GENERATED_AT,
    updatedBy: 'system.seed',
    source: 'SEED',
    dataVersion: DATA_VERSION,
    generationSeed: GENERATION_SEED,
  }
})

function isEventEligible(event, sku, distributor, regionId, weekId) {
  if (event.status === 'CANCELLED' || weekId < event.startWeek || weekId > event.endWeek) return false
  if (event.skuIds.length && !event.skuIds.includes(sku.id)) return false
  if (event.categories.length && !event.categories.includes(sku.category)) return false
  if (event.channelIds.length && !event.channelIds.includes(distributor.id)) return false
  if (event.regionIds.length && !event.regionIds.includes(regionId)) return false
  return true
}

function eventEffects(sku, distributor, week, planningWeekIndex) {
  const regionId = REGIONS.find((region) => region.name === distributor.region)?.id
  const eligible = DEMAND_EVENTS.filter((event) => isEventEligible(event, sku, distributor, regionId, week.weekId))
  const grouped = new Map()
  let priceDiscountRate = 0
  for (const event of eligible) {
    const startIndex = planningWeekIndex.get(event.startWeek)
    const endIndex = planningWeekIndex.get(event.endWeek)
    const currentIndex = planningWeekIndex.get(week.weekId)
    const duration = Math.max(1, endIndex - startIndex + 1)
    const position = Math.max(0, currentIndex - startIndex)
    let shapedUplift = event.upliftPct
    if (event.upliftShape === 'TRIANGULAR' && duration > 1) shapedUplift *= 1 - Math.abs((2 * position) / (duration - 1) - 1) * 0.35
    if (event.upliftShape === 'LAUNCH_TAIL') shapedUplift *= Math.exp(-0.35 * position)
    const group = grouped.get(event.stackingGroup) || { compound: 1, cap: event.maxStackedUpliftPct }
    group.compound *= 1 + shapedUplift
    group.cap = Math.min(group.cap, event.maxStackedUpliftPct)
    grouped.set(event.stackingGroup, group)
    priceDiscountRate = Math.max(priceDiscountRate, event.priceDiscountRate || 0)
  }
  let totalMultiplier = 1
  for (const group of grouped.values()) totalMultiplier *= 1 + Math.min(group.cap, group.compound - 1)
  const plannedUpliftRate = totalMultiplier - 1
  const realizationNoise = eligible.length ? stableSigned(`event-realization|${eligible.map((event) => event.eventId).join('+')}|${sku.id}|${distributor.id}|${week.weekId}`, 0.04) : 0
  return {
    appliedEventIds: eligible.map((event) => event.eventId),
    plannedUpliftRate,
    realizedUpliftRate: Math.max(-1, plannedUpliftRate + realizationNoise),
    priceDiscountRate,
  }
}

function npiCurve(curve, progress) {
  const t = clamp(progress, 0, 1)
  if (curve === 'LINEAR') return t
  if (curve === 'HOCKEY_STICK') return clamp(t < 0.5 ? 0.35 * t : 0.175 + 1.65 * (t - 0.5), 0, 1)
  const logistic = (x) => 1 / (1 + Math.exp(-x))
  return (logistic(8 * (t - 0.5)) - logistic(-4)) / (logistic(4) - logistic(-4))
}

function buildConsensusWorkflowData(planningWeeks) {
  const provenance = { source: 'SEED', dataVersion: DATA_VERSION, generationSeed: GENERATION_SEED }
  const anchorWeek = planningWeeks.find((week) => week.isAnchor)?.weekId || '2026-W33'
  const atHourOffset = (hours) => new Date(ANCHOR_MONDAY.getTime() + hours * 3600000).toISOString()
  const demandTemplates = [
    ['CATEGORY_REVIEW', 'Category Manager', 'category.manager@boat.com'],
    ['SALES_REVIEW', 'Sales Head', 'sales.manager@boat.com'],
    ['SOP_REVIEW', 'S&OP Lead', 'sop.lead@boat.com'],
    ['FINANCE_REVIEW', 'Finance', 'finance.controller@boat.com'],
  ]
  const productionTemplates = [
    ['SUPPLY_PLAN_SUBMIT', 'Supply Planner', 'supply.planner@boat.com'],
    ['PROCUREMENT_REVIEW', 'Procurement', 'procurement.manager@boat.com'],
    ['PLANT_REVIEW', 'Plant', 'plant.manager@boat.com'],
    ['SOP_APPROVAL', 'S&OP Lead', 'sop.lead@boat.com'],
  ]
  const workflowInstances = []
  const workflowSteps = []
  const entityAuditEvents = []
  const demandConsensusWorkflows = []

  SKUS.slice(0, 5).forEach((sku, skuIndex) => {
    const workflowId = `DCW-${sku.id}`
    const completedSteps = Math.floor(stableUnit01(`workflow-status|${workflowId}`) * 5)
    const status = completedSteps === 4 ? 'LOCKED' : demandTemplates[completedSteps][0]
    const statistical = Math.round(sku.baseWeekly * 4)
    const proposed = Math.round(statistical * (1 + [0.06, -0.04, 0.11, 0.02, -0.08][skuIndex]))
    const createdAt = atHourOffset(-144 + skuIndex * 3)
    const lastActionAt = atHourOffset(-144 + skuIndex * 3 + completedSteps * 12)
    const currentStep = completedSteps === 4 ? null : completedSteps + 1

    demandConsensusWorkflows.push({
      workflowId,
      skuId: sku.id,
      skuName: sku.name,
      planningWeek: anchorWeek,
      horizonType: skuIndex < 2 ? 'SHORT' : 'MID',
      statisticalFcst: statistical,
      channelSubmittedFcst: Math.round(statistical * 1.04),
      proposedConsensusFcst: proposed,
      finalConsensusFcst: status === 'LOCKED' ? proposed : null,
      status,
      currentStepOwner: currentStep ? demandTemplates[currentStep - 1][1] : null,
      updatedAt: lastActionAt,
      ...provenance,
    })
    workflowInstances.push({
      workflowId,
      workflowType: 'DEMAND_CONSENSUS',
      subjectType: 'DEMAND_FORECAST',
      subjectId: sku.id,
      sourceVersionId: `FCST-VINTAGE-${sku.id}-${anchorWeek}`,
      status,
      currentStep,
      dueAt: atHourOffset(168 + skuIndex * 24),
      lockedAt: status === 'LOCKED' ? lastActionAt : null,
      createdAt,
      updatedAt: lastActionAt,
      ...provenance,
    })
    demandTemplates.forEach(([stepCode, assignedRole, assignedUserId], templateIndex) => {
      const stepSequence = templateIndex + 1
      const isComplete = stepSequence <= completedSteps
      const isCurrent = stepSequence === currentStep
      workflowSteps.push({
        workflowId,
        workflowType: 'DEMAND_CONSENSUS',
        stepSequence,
        stepCode,
        assignedRole,
        assignedUserId,
        status: isComplete ? 'COMPLETED' : isCurrent ? 'IN_PROGRESS' : 'PENDING',
        decision: isComplete ? 'APPROVED' : null,
        comment: isComplete ? `${assignedRole} seed approval` : null,
        actedAt: isComplete ? atHourOffset(-144 + skuIndex * 3 + stepSequence * 12) : null,
        dueAt: atHourOffset(24 * stepSequence + skuIndex * 6),
        ...provenance,
      })
    })
    entityAuditEvents.push({
      auditId: `AUD-${workflowId}-001`, workflowId, workflowType: 'DEMAND_CONSENSUS', stepSequence: 1,
      entityType: 'DEMAND_FORECAST', entityId: sku.id, action: 'CREATED', fieldPath: 'proposedConsensusFcst',
      oldValue: null, newValue: proposed, actorUserId: 'demand.planner@boat.com', actorRole: 'Demand Planner',
      reasonCode: 'INITIAL_PROPOSAL', comment: 'Initial consensus proposal', occurredAt: createdAt, sequence: 1, ...provenance,
    })
    for (let stepIndex = 0; stepIndex < completedSteps; stepIndex++) {
      const [stepCode, assignedRole, assignedUserId] = demandTemplates[stepIndex]
      const nextStatus = stepIndex === 3 ? 'LOCKED' : demandTemplates[stepIndex + 1][0]
      entityAuditEvents.push({
        auditId: `AUD-${workflowId}-${String(stepIndex + 2).padStart(3, '0')}`, workflowId, workflowType: 'DEMAND_CONSENSUS', stepSequence: stepIndex + 1,
        entityType: 'DEMAND_FORECAST', entityId: sku.id, action: nextStatus === 'LOCKED' ? 'LOCKED' : 'APPROVED', fieldPath: 'status',
        oldValue: stepCode, newValue: nextStatus, actorUserId: assignedUserId, actorRole: assignedRole,
        reasonCode: 'SEED_APPROVAL', comment: `${assignedRole} seed approval`, occurredAt: atHourOffset(-144 + skuIndex * 3 + (stepIndex + 1) * 12), sequence: stepIndex + 2, ...provenance,
      })
    }
  })

  const planId = `CPP-${anchorWeek}`
  const productionWorkflowId = `PFW-${planId}`
  const completedProductionSteps = Math.floor(stableUnit01(`workflow-status|${productionWorkflowId}`) * 5)
  const productionStatus = completedProductionSteps === 0 ? 'DRAFT' : completedProductionSteps < 3 ? 'IN_REVIEW' : completedProductionSteps === 3 ? 'APPROVED' : 'LOCKED'
  const productionCreatedAt = atHourOffset(-192)
  const productionLastActionAt = atHourOffset(-192 + completedProductionSteps * 18)
  const productionCurrentStep = completedProductionSteps === 4 ? null : completedProductionSteps + 1
  const consensusProductionPlans = [{
    planId,
    workflowId: productionWorkflowId,
    planningCycle: `${anchorWeek} Rough-Cut Consensus Production Plan`,
    status: productionStatus,
    createdAt: productionCreatedAt,
    submittedBy: completedProductionSteps >= 1 ? productionTemplates[0][2] : null,
    submittedAt: completedProductionSteps >= 1 ? atHourOffset(-174) : null,
    reviewedBy: completedProductionSteps >= 3 ? productionTemplates[2][2] : null,
    reviewedAt: completedProductionSteps >= 3 ? atHourOffset(-138) : null,
    reviewNotes: completedProductionSteps >= 3 ? 'Procurement and plant feasibility reviewed' : null,
    approvedBy: completedProductionSteps >= 3 ? productionTemplates[2][2] : null,
    approvedAt: completedProductionSteps >= 3 ? atHourOffset(-138) : null,
    lockedBy: completedProductionSteps === 4 ? productionTemplates[3][2] : null,
    lockedAt: completedProductionSteps === 4 ? productionLastActionAt : null,
    updatedAt: productionLastActionAt,
    ...provenance,
  }]
  workflowInstances.push({
    workflowId: productionWorkflowId, workflowType: 'PRODUCTION_SIGNOFF', subjectType: 'CONSENSUS_PRODUCTION_PLAN', subjectId: planId,
    sourceVersionId: `RCCP-${anchorWeek}-V1`, status: productionStatus, currentStep: productionCurrentStep,
    dueAt: atHourOffset(240), lockedAt: productionStatus === 'LOCKED' ? productionLastActionAt : null,
    createdAt: productionCreatedAt, updatedAt: productionLastActionAt, ...provenance,
  })
  productionTemplates.forEach(([stepCode, assignedRole, assignedUserId], templateIndex) => {
    const stepSequence = templateIndex + 1
    const isComplete = stepSequence <= completedProductionSteps
    workflowSteps.push({
      workflowId: productionWorkflowId, workflowType: 'PRODUCTION_SIGNOFF', stepSequence, stepCode, assignedRole, assignedUserId,
      status: isComplete ? 'COMPLETED' : stepSequence === productionCurrentStep ? 'IN_PROGRESS' : 'PENDING',
      decision: isComplete ? 'APPROVED' : null, comment: isComplete ? `${assignedRole} seed approval` : null,
      actedAt: isComplete ? atHourOffset(-192 + stepSequence * 18) : null, dueAt: atHourOffset(stepSequence * 48), ...provenance,
    })
  })
  entityAuditEvents.push({
    auditId: `AUD-${productionWorkflowId}-001`, workflowId: productionWorkflowId, workflowType: 'PRODUCTION_SIGNOFF', stepSequence: 1,
    entityType: 'CONSENSUS_PRODUCTION_PLAN', entityId: planId, action: 'CREATED', fieldPath: 'status', oldValue: null, newValue: 'DRAFT',
    actorUserId: 'supply.planner@boat.com', actorRole: 'Supply Planner', reasonCode: 'PLAN_CREATED', comment: 'Initial rough-cut production plan',
    occurredAt: productionCreatedAt, sequence: 1, ...provenance,
  })
  for (let stepIndex = 0; stepIndex < completedProductionSteps; stepIndex++) {
    const [, assignedRole, assignedUserId] = productionTemplates[stepIndex]
    const oldStatus = stepIndex === 0 ? 'DRAFT' : stepIndex < 3 ? 'IN_REVIEW' : 'APPROVED'
    const newStatus = stepIndex < 2 ? 'IN_REVIEW' : stepIndex === 2 ? 'APPROVED' : 'LOCKED'
    entityAuditEvents.push({
      auditId: `AUD-${productionWorkflowId}-${String(stepIndex + 2).padStart(3, '0')}`, workflowId: productionWorkflowId, workflowType: 'PRODUCTION_SIGNOFF', stepSequence: stepIndex + 1,
      entityType: 'CONSENSUS_PRODUCTION_PLAN', entityId: planId, action: newStatus === 'LOCKED' ? 'LOCKED' : 'APPROVED', fieldPath: 'status',
      oldValue: oldStatus, newValue: newStatus, actorUserId: assignedUserId, actorRole: assignedRole, reasonCode: 'SEED_APPROVAL',
      comment: `${assignedRole} seed approval`, occurredAt: atHourOffset(-192 + (stepIndex + 1) * 18), sequence: stepIndex + 2, ...provenance,
    })
  }

  return { demandConsensusWorkflows, consensusProductionPlans, workflowInstances, workflowSteps, entityAuditEvents }
}

function generateDataset() {
  const weeks = buildWeeks(26)
  const planningWeeks = buildPlanningWeeks()
  const planningWeekIndex = new Map(planningWeeks.map((week, index) => [week.weekId, index]))
  const weekly = []

  for (const sku of SKUS) {
    for (const dist of DISTRIBUTORS) {
      let distStock = sku.baseWeekly * DIST_FACTOR[dist.id] * rnd(1.8, 2.4)
      let retailStock = sku.baseWeekly * DIST_FACTOR[dist.id] * rnd(0.6, 1.1)

      weeks.forEach((w, idx) => {
        const rawSeasonality = seasonality(w.weekNumber, sku.seasonPeakWeek, sku.seasonAmp)
        const seas = sku.lifecycleStage === 'EOL'
          ? 1
          : sku.lifecycleStage === 'DECLINE'
            ? 1 + (rawSeasonality - 1) * 0.5
            : rawSeasonality
        const trend = lifecycleTrend(sku, idx, weeks.length)
        const event = eventEffects(sku, dist, w, planningWeekIndex)
        const variability = skuWeekVariabilityFactor(sku.id, w.weekId)
        const noise = rnd(0.88, 1.12)

        const tertiary = Math.max(0, Math.round(
          sku.baseWeekly * DIST_FACTOR[dist.id] * seas * trend * (1 + event.realizedUpliftRate) * variability * noise
        ))
        // Forecast accuracy improves over the dataset period:
        //   Early weeks → wide spread (noisy, big over/under-estimates)
        //   Later weeks → tight spread (converges toward actual)
        const progress = idx / Math.max(1, weeks.length - 1) // 0 → 1
        const forecastLo = 0.65 + progress * 0.30  // 0.65 → 0.95
        const forecastHi = 1.45 - progress * 0.32  // 1.45 → 1.13

        // Week-level demand shock weeks: forecast is forced BELOW actual for every
        // SKU×distributor row in these weeks so the aggregate line clearly dips.
        // idx 6  ≈ Week 7  (early shock — forecast badly under-estimated)
        // idx 17 ≈ Week 18 (mid-period shock — one more miss before convergence)
        const SHOCK_WEEKS = new Set([6, 17])
        const forecastMult = SHOCK_WEEKS.has(idx)
          ? rnd(0.68, 0.84)                       // guaranteed under-forecast
          : rnd(forecastLo, forecastHi)           // normal improving variance
        const eventForecastCorrection = (1 + event.plannedUpliftRate) / Math.max(0.01, 1 + event.realizedUpliftRate)
        const secondary = Math.max(0, Math.round(tertiary * forecastMult * eventForecastCorrection))
        const primary = Math.max(0, Math.round(secondary * rnd(0.85, 1.35)))

        distStock = Math.max(0, distStock + primary - secondary)
        retailStock = Math.max(0, retailStock + secondary - tertiary)

        // Preserve the legacy Mulberry32 consumption step so additions after this
        // generator do not perturb the established stream. Promotion behavior is
        // now governed exclusively by DEMAND_EVENTS, not this retired draw.
        const retiredPromotionDraw = rand()
        if (retiredPromotionDraw < 0.08) rnd(0.85, 0.92)
        const price = round(sku.price * (1 - event.priceDiscountRate), 2)
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
          lifecycleStage: sku.lifecycleStage,
          forecastMethod: sku.forecastMethod,
          appliedEventIds: event.appliedEventIds,
          plannedEventUpliftRate: round(event.plannedUpliftRate, 4),
          realizedEventUpliftRate: round(event.realizedUpliftRate, 4),
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

  const lifecycle = buildLifecycleRows()
  const npiReadinessItems = buildNpiReadinessItems()
  const npiForecasts = buildNpiForecasts(weekly, planningWeeks)
  const inventoryNorms = buildChannelInventoryNorms(weekly, weeks)
  const demandListings = buildDemandListings()
  const demandChannelIntegrations = buildDemandChannelIntegrations(demandListings)
  // DR2 ownership is preserved in the emitted collection names: supplier and
  // procurement facts remain Sourcing-owned; forecast facts remain Demand-owned.
  const sourcing = buildSourcingAndProcurementData()
  const forecastHistory = buildForecastAccuracyHistory(weekly, planningWeeks)
  const consensusWorkflows = buildConsensusWorkflowData(planningWeeks)

  return {
    weeks,
    planningWeeks,
    weekly,
    lifecycle,
    npiProducts: npiForecasts,
    npiForecasts,
    npiReadinessItems,
    eventTemplates: EVENT_TEMPLATES.map((row) => ({ ...row })),
    demandEvents: DEMAND_EVENTS.map((row) => ({ ...row })),
    events: DEMAND_EVENTS.map((row) => ({ ...row })),
    inventoryNorms,
    demandListings,
    demandChannelIntegrations,
    ...sourcing,
    ...forecastHistory,
    ...consensusWorkflows,
  }
}

function buildLifecycleRows() {
  return SKUS.map((sku) => ({
    skuId: sku.id,
    skuName: sku.name,
    category: sku.category,
    lifecycleStage: sku.lifecycleStage,
    stage: sku.lifecycleStage === 'MATURE' ? 'MATURITY' : sku.lifecycleStage,
    lifecycleStageSinceWeek: sku.lifecycleStageSinceWeek,
    stageSince: sku.lifecycleStageSinceWeek,
    launchWeek: sku.launchWeek,
    hasSalesHistory: sku.hasSalesHistory,
    forecastMethod: sku.forecastMethod,
    forecastMethods: {
      short: sku.forecastMethod,
      mid: sku.lifecycleStage === 'EOL' ? 'EOL_CLEARANCE' : sku.forecastMethod,
      long: sku.lifecycleStage === 'GROWTH' ? 'TREND_EVENT' : sku.forecastMethod,
    },
    analogSkuIds: sku.analogSkuIds,
    expectedStageEndWeek: sku.expectedStageEndWeek,
    replacementSkuId: sku.replacementSkuId,
    discontinueWeek: sku.discontinueWeek,
    effectiveFromWeek: sku.effectiveFromWeek,
    effectiveToWeek: sku.effectiveToWeek,
    version: sku.version,
    status: sku.status,
    updatedAt: GENERATED_AT,
    updatedBy: 'system.seed',
    source: 'SEED',
    dataVersion: DATA_VERSION,
    generationSeed: GENERATION_SEED,
  }))
}

function buildNpiReadinessItems() {
  const template = [
    ['BOM', 'BOM_RELEASED', 'Production BOM released'],
    ['BOM', 'PACKAGING_APPROVED', 'Packaging BOM approved'],
    ['ODM', 'PARTNER_CONFIRMED', 'ODM/EMS partner allocation confirmed'],
    ['ODM', 'PILOT_LINE_BOOKED', 'Pilot assembly line reserved'],
    ['IMPORT', 'COMPONENT_PLAN', 'Imported component plan active'],
    ['IMPORT', 'CLEARANCE_DOCS', 'Customs documentation ready'],
    ['LISTING', 'CHANNEL_LISTED', 'Priority channel listing live'],
    ['LISTING', 'CONTENT_READY', 'Product content and imagery approved'],
  ]
  return NPI_PRODUCTS.flatMap((npi) => {
    const completedCount = Math.round(npi.readinessRate * template.length)
    return template.map(([gateCode, itemCode, description], index) => {
      const completed = index < completedCount
      return {
        npiId: npi.npiId,
        gateCode,
        itemCode,
        description,
        weight: 0.125,
        ownerUserId: `${gateCode.toLowerCase()}.owner@boat.com`,
        dueWeek: npi.launchWeek,
        status: completed ? 'COMPLETED' : 'OPEN',
        completedAt: completed ? GENERATED_AT : null,
        evidenceType: completed ? `${gateCode}_REFERENCE` : null,
        evidenceRef: completed ? `${gateCode}-${npi.skuId}-${String(index + 1).padStart(2, '0')}` : null,
        blockedReason: null,
        source: 'SEED',
        dataVersion: DATA_VERSION,
        generationSeed: GENERATION_SEED,
      }
    })
  })
}

function buildNpiForecasts(weekly, planningWeeks) {
  const closedWeekIds = [...new Set(weekly.map((row) => row.weekId))].sort().slice(-13)
  const totalBySkuWeek = new Map()
  for (const row of weekly) {
    const key = `${row.skuId}|${row.weekId}`
    totalBySkuWeek.set(key, (totalBySkuWeek.get(key) || 0) + row.tertiary)
  }
  const averageForSku = (skuId) => closedWeekIds.reduce((sum, weekId) => sum + (totalBySkuWeek.get(`${skuId}|${weekId}`) || 0), 0) / Math.max(1, closedWeekIds.length)
  const planningIndex = new Map(planningWeeks.map((week, index) => [week.weekId, index]))
  const distFactorTotal = Object.values(DIST_FACTOR).reduce((sum, value) => sum + value, 0)

  return NPI_PRODUCTS.map((npi) => {
    const analogWeights = [0.6, 0.3, 0.1]
    const analogWeekly = npi.analogSkuIds.reduce((sum, skuId, index) => sum + averageForSku(skuId) * analogWeights[index], 0)
    const peakWeeklyUnits = Math.round(Math.max(npi.targetPeakWeeklyUnits, analogWeekly * (0.6 + 0.3 * stableUnit01(`npi-peak|${npi.npiId}`))))
    const launchIndex = planningIndex.get(npi.launchWeek)
    const channelProjection = []
    const projection = []

    for (let offset = 0; offset < npi.rampWeeks; offset++) {
      const targetWeek = planningWeeks[launchIndex + offset]
      const progress = (offset + 1) / npi.rampWeeks
      const curveFactor = npiCurve(npi.rampCurve, progress)
      const readinessFactor = 0.65 + 0.35 * npi.readinessRate
      let totalQty = 0
      DISTRIBUTORS.forEach((distributor) => {
        const channelShare = DIST_FACTOR[distributor.id] / distFactorTotal
        const stableKey = `npi-forecast|${npi.npiId}|${distributor.id}|${targetWeek.weekId}`
        const forecastQty = Math.max(0, Math.round(peakWeeklyUnits * curveFactor * readinessFactor * channelShare * (1 + stableSigned(stableKey, 0.05))))
        totalQty += forecastQty
        channelProjection.push({
          weekId: targetWeek.weekId,
          distributorId: distributor.id,
          channelShare: round(channelShare, 4),
          forecastQty,
          actualQty: null,
        })
      })
      projection.push({ week: targetWeek.weekId, weekId: targetWeek.weekId, launchOffsetWeek: offset + 1, units: totalQty, forecastQty: totalQty })
    }

    return {
      ...npi,
      analogWeeklyUnits: Math.round(analogWeekly),
      peakWeeklyUnits,
      targetPeakWeeklyUnits: npi.targetPeakWeeklyUnits,
      projection,
      channelProjection,
      actualHistory: [],
    }
  })
}

function buildChannelInventoryNorms(weekly, weeks) {
  const skuConsumption = SKUS.map((sku) => ({
    skuId: sku.id,
    value: weekly.filter((row) => row.skuId === sku.id).reduce((sum, row) => sum + row.tertiary * row.price, 0),
  })).sort((a, b) => b.value - a.value || a.skuId.localeCompare(b.skuId))
  const totalConsumption = skuConsumption.reduce((sum, row) => sum + row.value, 0) || 1
  let cumulative = 0
  const abcBySku = new Map(skuConsumption.map((row) => {
    cumulative += row.value
    const share = cumulative / totalConsumption
    return [row.skuId, share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C']
  }))
  const serviceByClass = { A: { serviceLevel: 0.99, zScore: 2.326 }, B: { serviceLevel: 0.975, zScore: 1.96 }, C: { serviceLevel: 0.95, zScore: 1.645 } }
  const effectiveFromWeek = weeks[weeks.length - 1]?.weekId

  return SKUS.flatMap((sku) => DISTRIBUTORS.map((distributor) => {
    const history = weekly.filter((row) => row.skuId === sku.id && row.distributorId === distributor.id)
    const meanWeeklyDemand = history.reduce((sum, row) => sum + row.tertiary, 0) / Math.max(1, history.length)
    const variance = history.reduce((sum, row) => sum + (row.tertiary - meanWeeklyDemand) ** 2, 0) / Math.max(1, history.length)
    const demandCv = meanWeeklyDemand ? Math.sqrt(variance) / meanWeeklyDemand : 0
    const meanDailyDemand = meanWeeklyDemand / 7
    const leadTimeDays = distributor.tier === 'A' ? 4 : distributor.tier === 'B' ? 7 : 14
    const reviewPeriodDays = distributor.tier === 'C' ? 14 : 7
    const abcClass = abcBySku.get(sku.id) || 'C'
    const { serviceLevel, zScore } = serviceByClass[abcClass]
    const sigmaLead = meanDailyDemand * demandCv * Math.sqrt(leadTimeDays)
    const safetyStockQty = Math.round(zScore * sigmaLead)
    const cycleStockQty = Math.round(meanDailyDemand * reviewPeriodDays)
    const targetStockQty = safetyStockQty + cycleStockQty
    const targetDos = clamp(Math.round(targetStockQty / Math.max(meanDailyDemand, 1)), 7, 45)
    const minDos = Math.max(5, targetDos - 5)
    const maxDos = Math.min(60, targetDos + 8)
    const latest = history[history.length - 1]
    const actualDos = Math.max(0, Math.round((latest?.distributorStock || 0) / Math.max(meanDailyDemand, 1)))
    return {
      normId: `NORM-${sku.id}-${distributor.id}-V1`,
      skuId: sku.id,
      skuName: sku.name,
      category: sku.category,
      distributorId: distributor.id,
      distributorName: distributor.name,
      abcClass,
      basis: history.length ? 'HISTORY' : 'ANALOG',
      leadTimeDays,
      reviewPeriodDays,
      serviceLevel,
      serviceLevelTarget: round(serviceLevel * 100, 1),
      zScore,
      meanWeeklyDemand: Math.round(meanWeeklyDemand),
      demandCv: round(demandCv, 4),
      safetyStockQty,
      cycleStockQty,
      targetStockQty,
      suggestedDos: targetDos,
      targetDos,
      minDos,
      maxDos,
      actualDos,
      overrideDos: null,
      overrideReason: null,
      approvedBy: null,
      suggestionBasis: 'ABC_CV_LEAD_TIME_SERVICE_LEVEL',
      effectiveFromWeek,
      effectiveToWeek: null,
      version: 1,
      status: 'ACTIVE',
      createdAt: GENERATED_AT,
      updatedAt: GENERATED_AT,
      updatedBy: 'system.seed',
      source: 'SEED',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    }
  }))
}

function buildDemandListings() {
  return SKUS.flatMap((sku) => DISTRIBUTORS.map((distributor, distributorIndex) => {
    const active = sku.lifecycleStage !== 'EOL' || stableUnit01(`listing|${sku.id}|${distributor.id}`) >= 0.5
    return {
      listingId: `LST-${sku.id}-${distributor.id}`,
      skuId: sku.id,
      skuName: sku.name,
      category: sku.category,
      distributorId: distributor.id,
      distributorName: distributor.name,
      region: distributor.region,
      regionId: distributor.regionId,
      status: active ? 'ACTIVE' : 'DELISTED',
      effectiveDate: `2026-${String((distributorIndex % 6) + 1).padStart(2, '0')}-01`,
      delistingDate: active ? null : '2026-07-31',
      moq: sku.price >= 5000 ? 25 : sku.price >= 2000 ? 50 : 100,
      exclusivity: false,
      updatedAt: GENERATED_AT,
      updatedBy: 'system.seed',
      source: 'SEED',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    }
  }))
}

function buildDemandChannelIntegrations(listings) {
  const channelTypes = ['GENERAL_TRADE', 'MODERN_TRADE_OFFLINE', 'ONLINE_MARKETPLACE', 'D2C', 'GENERAL_TRADE', 'MODERN_TRADE_OFFLINE', 'GENERAL_TRADE', 'ONLINE_MARKETPLACE']
  const sourceTypes = ['EDI_SFTP', 'EDI_SFTP', 'API_PULL', 'API_PULL', 'MANUAL_UPLOAD', 'EDI_SFTP', 'EDI_SFTP', 'API_PULL']
  return DISTRIBUTORS.map((distributor, index) => {
    const sourceType = sourceTypes[index] || 'EDI_SFTP'
    const expectedCadenceHours = sourceType === 'API_PULL' ? 2 : sourceType === 'MANUAL_UPLOAD' ? 24 : 4
    return {
      distributorId: distributor.id,
      distributorName: distributor.name,
      region: distributor.region,
      regionId: distributor.regionId,
      headquartersCity: distributor.headquartersCity,
      primaryStates: distributor.primaryStates,
      tier: distributor.tier,
      channelType: channelTypes[index] || 'GENERAL_TRADE',
      sourceType,
      expectedCadenceHours,
      dataDomains: ['TERTIARY_SALES', 'CHANNEL_STOCK', 'DOS'],
      enabled: true,
      lastSyncAt: GENERATED_AT,
      updatedAt: GENERATED_AT,
      updatedBy: 'system.seed',
      freshnessHours: expectedCadenceHours / 2,
      recordCount: SKUS.length * 26,
      activeListings: listings.filter((row) => row.distributorId === distributor.id && row.status === 'ACTIVE').length,
      healthStatus: 'HEALTHY',
      gapFlag: null,
      source: 'SEED',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    }
  })
}

function isoAtDayOffset(baseDate, days) {
  const date = new Date(baseDate)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function roundToMultiple(value, multiple) {
  return Math.round(value / multiple) * multiple
}

function buildSourcingAndProcurementData() {
  const partnerSeeds = [
    { partnerId: 'MFG-WAVECRAFT-NOIDA', partnerName: 'WaveCraft EMS India', partnerType: 'EMS', tier: 'TIER_1', city: 'Noida', country: 'IN', defaultLeadTimeDays: 12, categories: ['TWS Earbuds', 'Neckbands'] },
    { partnerId: 'MFG-SONICEDGE-CHENNAI', partnerName: 'SonicEdge Devices', partnerType: 'ODM', tier: 'TIER_1', city: 'Chennai', country: 'IN', defaultLeadTimeDays: 14, categories: ['Smartwatches', 'TWS Earbuds'] },
    { partnerId: 'MFG-AARAV-MANESAR', partnerName: 'Aarav Wearables Manufacturing', partnerType: 'EMS', tier: 'TIER_2', city: 'Manesar', country: 'IN', defaultLeadTimeDays: 18, categories: ['Smartwatches', 'Wired Audio'] },
    { partnerId: 'MFG-TRIDENT-BENGALURU', partnerName: 'Trident Audio Systems', partnerType: 'ODM', tier: 'TIER_2', city: 'Bengaluru', country: 'IN', defaultLeadTimeDays: 20, categories: ['Portable Speakers', 'Neckbands', 'Wired Audio'] },
  ]

  const manufacturingPartners = partnerSeeds.map((seed) => {
    // Exactly one append-only Mulberry32 draw per sorted partner, after all
    // pre-existing generator steps. Entity noise below uses FNV-1a only.
    const totalCapacityUnitsPerWeek = roundToMultiple(180000 + rand() * 220000, 1000)
    const contractedCapacityUnitsPerWeek = roundToMultiple(totalCapacityUnitsPerWeek * (0.68 + 0.14 * stableUnit01(`partner|${seed.partnerId}|contracted`)), 1000)
    const spotCapacityUnitsPerWeek = totalCapacityUnitsPerWeek - contractedCapacityUnitsPerWeek
    const npiReservedCapacityUnitsPerWeek = Math.min(contractedCapacityUnitsPerWeek, roundToMultiple(totalCapacityUnitsPerWeek * (0.06 + 0.06 * stableUnit01(`partner|${seed.partnerId}|npi`)), 1000))
    return {
      ...seed,
      supplierCode: seed.partnerId,
      supplierName: seed.partnerName,
      vendorType: seed.partnerType,
      tierClassification: seed.tier,
      qualifiedCategoryCodes: seed.categories,
      totalCapacityUnitsPerWeek,
      totalProductionCapacityUnitsPerWeek: totalCapacityUnitsPerWeek,
      contractedCapacityUnitsPerWeek,
      spotCapacityUnitsPerWeek,
      npiReservedCapacityUnitsPerWeek,
      npiRampCapacityUnitsPerWeek: npiReservedCapacityUnitsPerWeek,
      commercialCurrency: 'INR',
      currency: 'INR',
      status: 'APPROVED',
      effectiveFromWeek: '2026-W01',
      effectiveToWeek: null,
      version: 1,
      syntheticRelationship: true,
      createdAt: GENERATED_AT,
      updatedAt: GENERATED_AT,
      source: 'SEED',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    }
  })

  const manufacturingPartnerLines = []
  for (const partner of manufacturingPartners) {
    const lineCount = 2 + Math.floor(stableUnit01(`partner-lines|${partner.partnerId}`) * 2)
    const rawLines = Array.from({ length: lineCount }, (_, index) => {
      const category = partner.qualifiedCategoryCodes[index % partner.qualifiedCategoryCodes.length]
      const qualifiedSkuIds = SKUS.filter((sku) => sku.category === category).map((sku) => sku.id)
      const shiftsPerDay = partner.tier === 'TIER_1' ? 3 : 2
      const hoursPerShift = 8
      const workingDays = 6
      const ratedUnitsPerHour = 900 + Math.floor(700 * stableUnit01(`line-rate|${partner.partnerId}|${index + 1}`))
      const yieldRate = round(0.965 + 0.025 * stableUnit01(`line-yield|${partner.partnerId}|${index + 1}`), 4)
      const changeoverHours = round(2 + 4 * stableUnit01(`line-changeover|${partner.partnerId}|${index + 1}`), 1)
      const grossWeeklyCapacity = shiftsPerDay * hoursPerShift * workingDays * ratedUnitsPerHour
      const rawCapacity = Math.max(0, grossWeeklyCapacity * yieldRate - changeoverHours * ratedUnitsPerHour)
      return { index, category, qualifiedSkuIds, shiftsPerDay, hoursPerShift, workingDays, ratedUnitsPerHour, yieldRate, changeoverHours, rawCapacity }
    })
    const rawTotal = rawLines.reduce((sum, line) => sum + line.rawCapacity, 0) || 1
    let assignedCapacity = 0
    rawLines.forEach((line, index) => {
      const isLast = index === rawLines.length - 1
      const lineCapacityUnitsPerWeek = isLast
        ? partner.totalCapacityUnitsPerWeek - assignedCapacity
        : roundToMultiple(partner.totalCapacityUnitsPerWeek * line.rawCapacity / rawTotal, 100)
      assignedCapacity += lineCapacityUnitsPerWeek
      manufacturingPartnerLines.push({
        partnerId: partner.partnerId,
        supplierCode: partner.supplierCode,
        lineId: `${partner.partnerId}-LINE-${index + 1}`,
        lineName: `${line.category} Assembly Line ${index + 1}`,
        lineType: line.category.toUpperCase().replaceAll(/[^A-Z0-9]+/g, '_'),
        qualifiedSkuIds: line.qualifiedSkuIds,
        qualifiedCategoryCodes: [line.category],
        shiftsPerDay: line.shiftsPerDay,
        hoursPerShift: line.hoursPerShift,
        workingDays: line.workingDays,
        ratedUnitsPerHour: line.ratedUnitsPerHour,
        yieldRate: line.yieldRate,
        changeoverHours: line.changeoverHours,
        lineCapacityUnitsPerWeek,
        minimumOrderQty: 500,
        minimumOrderQuantity: 500,
        orderMultiple: 100,
        leadTimeDays: partner.defaultLeadTimeDays + index * 2,
        npiCapable: index === 0 || stableUnit01(`line-npi|${partner.partnerId}|${index + 1}`) > 0.55,
        status: 'ACTIVE',
        effectiveFromWeek: '2026-W01',
        effectiveToWeek: null,
        version: 1,
        createdAt: GENERATED_AT,
        updatedAt: GENERATED_AT,
        source: 'SEED',
        dataVersion: DATA_VERSION,
        generationSeed: GENERATION_SEED,
      })
    })
  }

  const supplierMaster = manufacturingPartners.map((partner) => ({
    supplierCode: partner.supplierCode,
    partnerId: partner.partnerId,
    supplierName: partner.partnerName,
    partnerName: partner.partnerName,
    country: partner.country,
    city: partner.city,
    contactPerson: 'Synthetic Sourcing Contact',
    rating: partner.tier === 'TIER_1' ? 4.8 : 4.5,
    qualityScore: partner.tier === 'TIER_1' ? 98.5 : 96.8,
    onTimeDelivery: partner.tier === 'TIER_1' ? 95 : 90,
    defaultLeadTimeDays: partner.defaultLeadTimeDays,
    status: partner.status,
    profile: `${partner.partnerName} is a fictional demonstration ${partner.partnerType} partner for the boAt S&OP dataset; no real supplier relationship is implied.`,
    vendorType: partner.partnerType,
    tierClassification: partner.tier,
    totalProductionCapacityUnitsPerWeek: partner.totalCapacityUnitsPerWeek,
    contractedCapacityUnitsPerWeek: partner.contractedCapacityUnitsPerWeek,
    spotCapacityUnitsPerWeek: partner.spotCapacityUnitsPerWeek,
    npiRampCapacityUnitsPerWeek: partner.npiReservedCapacityUnitsPerWeek,
    currency: 'INR',
    syntheticRelationship: true,
    createdAt: GENERATED_AT,
    updatedAt: GENERATED_AT,
    source: 'SEED',
    dataVersion: DATA_VERSION,
    generationSeed: GENERATION_SEED,
  }))

  const supplierProductMapping = manufacturingPartnerLines.flatMap((line) => line.qualifiedSkuIds.map((skuId, skuIndex) => {
    const sku = SKUS.find((item) => item.id === skuId)
    return {
      supplierCode: line.supplierCode,
      partnerId: line.partnerId,
      lineId: line.lineId,
      skuCode: skuId,
      supplierSku: `${line.supplierCode}-${skuId}`,
      leadTimeDays: line.leadTimeDays,
      minimumOrderQuantity: line.minimumOrderQty,
      orderMultiple: line.orderMultiple,
      purchasePrice: sku.cost,
      purchasePricePaise: Math.round(sku.cost * 100),
      currency: 'INR',
      preferredSupplier: skuIndex === 0,
      maximumSupplyCapacity: line.lineCapacityUnitsPerWeek,
      status: 'ACTIVE',
      createdAt: GENERATED_AT,
      updatedAt: GENERATED_AT,
      source: 'SEED',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    }
  }))

  const purchaseOrders = []
  const poExclusions = []
  const poRevisions = []
  const goodsReceiptInspections = []
  const orderWeekOffsets = [-50, -26, -13, -8, -4, -1, 2, 5]
  let poSequence = 1000
  for (const partner of manufacturingPartners) {
    const partnerLines = manufacturingPartnerLines.filter((line) => line.partnerId === partner.partnerId)
    orderWeekOffsets.forEach((weekOffset, cycleIndex) => {
      const line = partnerLines[cycleIndex % partnerLines.length]
      const skuId = line.qualifiedSkuIds[cycleIndex % line.qualifiedSkuIds.length]
      const sku = SKUS.find((item) => item.id === skuId)
      const poNumber = `PUR-2026-${String(poSequence++).padStart(5, '0')}`
      const orderDate = isoAtDayOffset(ANCHOR_MONDAY, weekOffset * 7)
      const plannedHandoverDate = isoAtDayOffset(orderDate, line.leadTimeDays)
      const spreadDays = partner.tier === 'TIER_1' ? 2 : 4
      const handoverVarianceDays = Math.round(stableSigned(`po-handover|${poNumber}`, spreadDays))
      const candidateActualHandoverDate = isoAtDayOffset(plannedHandoverDate, handoverVarianceDays)
      const isCompleted = candidateActualHandoverDate < ANCHOR_MONDAY.toISOString().slice(0, 10)
      const actualHandoverDate = isCompleted ? candidateActualHandoverDate : null
      const promisedDeliveryDate = isoAtDayOffset(plannedHandoverDate, 3)
      const actualReceiptDate = actualHandoverDate ? isoAtDayOffset(actualHandoverDate, 2 + Math.floor(3 * stableUnit01(`po-receipt|${poNumber}`))) : null
      const orderedQty = roundToMultiple((sku.baseWeekly * (2.2 + 1.8 * stableUnit01(`po-qty|${poNumber}`))), line.orderMultiple)
      const hasPartialReceipt = isCompleted && stableUnit01(`po-partial|${poNumber}`) < 0.12
      const handedOverQty = isCompleted ? (hasPartialReceipt ? roundToMultiple(orderedQty * 0.8, line.orderMultiple) : orderedQty) : 0
      const receivedQty = isCompleted ? handedOverQty : 0
      const unitPricePaise = Math.round(sku.cost * 100)
      const taxPaise = Math.round(orderedQty * unitPricePaise * 0.18)
      const lineValuePaise = orderedQty * unitPricePaise + taxPaise
      const revisionCount = Math.floor(3 * stableUnit01(`po-revisions|${poNumber}`))
      const poLineId = `${poNumber}-L1`
      const lineRecord = { poLineId, skuId, skuCode: skuId, orderedQty, handedOverQty, receivedQty, unitPricePaise, taxPaise, lineValuePaise, productionNeedWeek: buildWeekRecord(new Date(`${plannedHandoverDate}T00:00:00.000Z`)).weekId, sourcePlanVersionId: 'PLAN-2026-W33-V1' }
      const po = {
        poNumber,
        partnerId: partner.partnerId,
        supplierCode: partner.supplierCode,
        poType: 'DOMESTIC',
        orderDate,
        currency: 'INR',
        status: isCompleted ? 'CLOSED' : 'CONFIRMED',
        plannedHandoverDate,
        actualHandoverDate,
        handoverVarianceDays: actualHandoverDate ? handoverVarianceDays : null,
        promisedDeliveryDate,
        actualReceiptDate,
        shipFromLocation: `${partner.city}, ${partner.country}`,
        receiveAtLocationId: 'WH-DEL-NORTH',
        incoterm: 'FCA',
        approvedBy: 'sourcing.manager@boat.com',
        approvedAt: `${orderDate}T08:00:00.000Z`,
        currentRevision: revisionCount,
        skuCode: skuId,
        orderedQty,
        handedOverQty,
        receivedQty,
        unitPricePaise,
        totalValuePaise: lineValuePaise,
        expectedDeliveryDate: `${promisedDeliveryDate}T00:00:00.000Z`,
        handoverDate: `${plannedHandoverDate}T00:00:00.000Z`,
        actualDeliveryDate: actualReceiptDate ? `${actualReceiptDate}T00:00:00.000Z` : null,
        lines: [lineRecord],
        createdAt: `${orderDate}T00:00:00.000Z`,
        updatedAt: GENERATED_AT,
        source: 'SEED',
        dataVersion: DATA_VERSION,
        generationSeed: GENERATION_SEED,
      }
      purchaseOrders.push(po)

      for (let revisionNo = 1; revisionNo <= revisionCount; revisionNo++) {
        const previousQty = orderedQty - (revisionCount - revisionNo + 1) * line.orderMultiple
        poRevisions.push({
          poNumber,
          revisionNo,
          changedFields: ['orderedQty'],
          oldValues: { orderedQty: previousQty },
          newValues: { orderedQty: previousQty + line.orderMultiple },
          reasonCode: 'PLAN_QUANTITY_CHANGE',
          comment: 'Quantity aligned to the latest approved supply-plan revision.',
          changedBy: 'sourcing.planner@boat.com',
          changedAt: `${isoAtDayOffset(orderDate, revisionNo)}T09:00:00.000Z`,
          sourceWorkflowId: null,
          source: 'SEED',
          dataVersion: DATA_VERSION,
          generationSeed: GENERATION_SEED,
        })
      }

      if (isCompleted && stableUnit01(`po-exclusion|${poNumber}`) < 0.1) {
        const codes = ['SUPPLIER_FORCE_MAJEURE', 'BUYER_HOLD', 'QUALITY_REJECTION', 'PARTIAL_ACCEPT', 'DATA_ERROR']
        const exclusionCode = codes[Math.min(codes.length - 1, Math.floor(stableUnit01(`po-exclusion-code|${poNumber}`) * codes.length))]
        poExclusions.push({
          poNumber,
          exclusionVersion: 1,
          exclusionCode,
          reasonText: `Approved synthetic ${exclusionCode.toLowerCase().replaceAll('_', ' ')} exclusion.`,
          effectiveFrom: `${plannedHandoverDate}T00:00:00.000Z`,
          effectiveTo: null,
          flaggedBy: 'sourcing.planner@boat.com',
          approvedBy: 'sourcing.manager@boat.com',
          flaggedAt: `${plannedHandoverDate}T08:00:00.000Z`,
          clearedAt: null,
          source: 'SEED',
          dataVersion: DATA_VERSION,
          generationSeed: GENERATION_SEED,
        })
      }

      if (isCompleted) {
        const receivedQuantity = receivedQty
        const sampleQty = Math.min(receivedQuantity, Math.max(32, Math.round(Math.sqrt(receivedQuantity) * 8)))
        const defectRate = 0.004 + 0.026 * stableUnit01(`grn-quality|${poNumber}|${poLineId}|1`)
        const rejectedQty = Math.min(receivedQuantity, Math.round(receivedQuantity * defectRate))
        const acceptedQty = receivedQuantity - rejectedQty
        goodsReceiptInspections.push({
          inspectionId: `GRI-${poNumber}-1`,
          poNumber,
          poLineId,
          partnerId: partner.partnerId,
          supplierCode: partner.supplierCode,
          skuId,
          receivedAt: `${actualReceiptDate}T10:00:00.000Z`,
          receivedQty: receivedQuantity,
          sampleQty,
          acceptedQty,
          rejectedQty,
          defectCode: rejectedQty ? 'COSMETIC_OR_FUNCTIONAL' : null,
          severity: rejectedQty / Math.max(receivedQuantity, 1) > 0.02 ? 'MAJOR' : 'MINOR',
          disposition: rejectedQty ? 'REWORK' : 'ACCEPT',
          batchIds: [`BATCH-${poNumber}`],
          inspectorUserId: 'quality.inspector@boat.com',
          evidenceRef: `QA-${poNumber}-1`,
          source: 'SEED',
          dataVersion: DATA_VERSION,
          generationSeed: GENERATION_SEED,
        })
      }
    })
  }

  const poAdherenceObservations = []
  const supplierReliabilityHistory = []
  for (const partner of manufacturingPartners) {
    for (const windowWeeks of [4, 13, 52]) {
      const windowStart = isoAtDayOffset(ANCHOR_MONDAY, -windowWeeks * 7)
      const partnerPos = purchaseOrders.filter((po) => po.partnerId === partner.partnerId && po.actualHandoverDate && po.plannedHandoverDate >= windowStart)
      const excludedPoNumbers = new Set(poExclusions.filter((row) => row.approvedBy).map((row) => row.poNumber))
      const eligiblePos = partnerPos.filter((po) => !excludedPoNumbers.has(po.poNumber))
      const onTimePoCount = eligiblePos.filter((po) => po.handoverVarianceDays <= 0).length
      const onTimeDeliveryRate = eligiblePos.length ? onTimePoCount / eligiblePos.length : 1
      const actualLeadTimes = eligiblePos.map((po) => Math.round((new Date(po.actualHandoverDate) - new Date(po.orderDate)) / 86400000))
      const actualAverageLeadTimeDays = actualLeadTimes.length ? actualLeadTimes.reduce((sum, value) => sum + value, 0) / actualLeadTimes.length : partner.defaultLeadTimeDays
      const meanAbsoluteLeadVariance = actualLeadTimes.length ? actualLeadTimes.reduce((sum, value) => sum + Math.abs(value - partner.defaultLeadTimeDays), 0) / actualLeadTimes.length : 0
      const leadTimeConsistencyScore = clamp(1 - meanAbsoluteLeadVariance / Math.max(partner.defaultLeadTimeDays, 1), 0, 1)
      const eligibleInspections = goodsReceiptInspections.filter((inspection) => inspection.partnerId === partner.partnerId && inspection.receivedAt.slice(0, 10) >= windowStart)
      const acceptedQty = eligibleInspections.reduce((sum, row) => sum + row.acceptedQty, 0)
      const rejectedQty = eligibleInspections.reduce((sum, row) => sum + row.rejectedQty, 0)
      const qualityAcceptanceRate = acceptedQty / Math.max(acceptedQty + rejectedQty, 1)
      const reliabilityScore = round(100 * (0.5 * onTimeDeliveryRate + 0.3 * leadTimeConsistencyScore + 0.2 * qualityAcceptanceRate), 1)
      const reliabilityGrade = reliabilityScore >= 92 ? 'A' : reliabilityScore >= 85 ? 'B' : reliabilityScore >= 75 ? 'C' : 'D'
      const common = {
        partnerId: partner.partnerId,
        supplierCode: partner.supplierCode,
        measurementWeek: '2026-W33',
        windowWeeks,
        eligiblePoCount: eligiblePos.length,
        onTimePoCount,
        onTimeDeliveryRate: round(onTimeDeliveryRate, 4),
        quotedLeadTimeDays: partner.defaultLeadTimeDays,
        actualAverageLeadTimeDays: round(actualAverageLeadTimeDays, 1),
        leadTimeVarianceDays: round(actualAverageLeadTimeDays - partner.defaultLeadTimeDays, 1),
        leadTimeConsistencyScore: round(leadTimeConsistencyScore, 4),
        acceptedQty,
        rejectedQty,
        qualityAcceptanceRate: round(qualityAcceptanceRate, 4),
        reliabilityScore,
        reliabilityGrade,
        sourcePoNumbers: eligiblePos.map((po) => po.poNumber),
        sourceInspectionIds: eligibleInspections.map((row) => row.inspectionId),
        measuredAt: GENERATED_AT,
        source: 'DERIVED',
        dataVersion: DATA_VERSION,
        generationSeed: GENERATION_SEED,
      }
      supplierReliabilityHistory.push(common)
      poAdherenceObservations.push({
        observationId: `POA-${partner.partnerId}-${windowWeeks}W-2026-W33`,
        ...common,
        adherencePct: round(onTimeDeliveryRate * 100, 1),
      })
    }
  }

  const poAdherenceHistory = [4, 13, 52].map((windowWeeks) => {
    const rows = poAdherenceObservations.filter((row) => row.windowWeeks === windowWeeks)
    const eligiblePoCount = rows.reduce((sum, row) => sum + row.eligiblePoCount, 0)
    const onTimePoCount = rows.reduce((sum, row) => sum + row.onTimePoCount, 0)
    return {
      window: `${windowWeeks}W`,
      windowWeeks,
      eligiblePoCount,
      onTimePoCount,
      adherencePct: round(onTimePoCount / Math.max(eligiblePoCount, 1) * 100, 1),
      measuredAt: GENERATED_AT,
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    }
  })

  return {
    manufacturingPartners,
    manufacturingPartnerLines,
    supplierMaster,
    supplierProductMapping,
    purchaseOrders,
    poExclusions,
    poRevisions,
    poAdherenceObservations,
    poAdherenceHistory,
    goodsReceiptInspections,
    supplierReliabilityHistory,
  }
}

function buildForecastAccuracyHistory(weekly, planningWeeks) {
  const planningIndexById = new Map(planningWeeks.map((week, index) => [week.weekId, index]))
  const storedActualByKey = new Map(weekly.map((row) => [`${row.skuId}|${row.distributorId}|${row.weekId}`, row]))
  const targetWeeks = planningWeeks.filter((week) => week.weekIndex >= -52 && week.weekIndex <= -1)
  const horizons = [1, 4, 13, 26, 39, 52]
  const sigmaByHorizon = (horizon) => horizon <= 4 ? 0.07 : horizon <= 26 ? 0.13 : 0.22
  const lifecycleMultiplier = { NEW: 1.35, GROWTH: 1.15, MATURE: 0.85, DECLINE: 1.1, EOL: 1.25 }
  const forecastVintages = []
  const forecastAccuracyHistory = []

  for (const sku of SKUS) {
    for (const distributor of DISTRIBUTORS) {
      for (const targetWeek of targetWeeks) {
        const stored = storedActualByKey.get(`${sku.id}|${distributor.id}|${targetWeek.weekId}`)
        const historicalProgress = targetWeek.weekIndex + 52
        const rawSeasonality = seasonality(targetWeek.weekNumber, sku.seasonPeakWeek, sku.seasonAmp)
        const stageSeasonality = sku.lifecycleStage === 'EOL' ? 1 : sku.lifecycleStage === 'DECLINE' ? 1 + (rawSeasonality - 1) * 0.5 : rawSeasonality
        const historicalTrend = sku.lifecycleStage === 'DECLINE'
          ? Math.max(0.6, 1.08 - historicalProgress * 0.006)
          : sku.lifecycleStage === 'EOL'
            ? Math.max(0.2, 0.85 - historicalProgress * 0.012)
            : 0.82 + historicalProgress * Math.max(0.002, sku.growth)
        const generatedActual = Math.max(0, Math.round(sku.baseWeekly * DIST_FACTOR[distributor.id] * stageSeasonality * historicalTrend * (1 + stableSigned(`historical-actual|${sku.id}|${distributor.id}|${targetWeek.weekId}`, 0.12))))
        const actualQty = stored?.tertiary ?? generatedActual
        const actualVersionId = `ACT-${sku.id}-${distributor.id}-${targetWeek.weekId}-V1`

        for (const horizonWeeks of horizons) {
          const targetPlanningIndex = planningIndexById.get(targetWeek.weekId)
          const issuedWeek = planningWeeks[targetPlanningIndex - horizonWeeks]
          const horizonBand = horizonWeeks <= 4 ? 'SHORT' : horizonWeeks <= 26 ? 'MID' : 'LONG'
          const sigma = sigmaByHorizon(horizonWeeks) * lifecycleMultiplier[sku.lifecycleStage]
          const forecastStableKey = `forecast|${sku.id}|${distributor.id}|${targetWeek.weekId}|H${horizonWeeks}|V1|qty`
          const forecastQty = Math.max(0, Math.round(actualQty * (1 + stableSigned(forecastStableKey, sigma))))
          const lowerQty = Math.max(0, Math.round(forecastQty * (1 - 1.28 * sigma)))
          const upperQty = Math.max(lowerQty, Math.round(forecastQty * (1 + 1.28 * sigma)))
          const forecastId = `FC-${sku.id}-${distributor.id}-${targetWeek.weekId}-H${horizonWeeks}-V1`
          const eventUpliftQty = stored ? Math.round(stored.tertiary * (stored.plannedEventUpliftRate || 0) / Math.max(1, 1 + (stored.plannedEventUpliftRate || 0))) : 0
          const forecast = {
            forecastId,
            skuId: sku.id,
            channelId: distributor.id,
            distributorId: distributor.id,
            targetWeek: targetWeek.weekId,
            horizonWeeks,
            horizonBand,
            modelCode: sku.forecastMethod,
            issuedWeek: issuedWeek.weekId,
            forecastVersionId: 'FCST-2026-W33-V1',
            lifecycleStageAtIssue: sku.lifecycleStage,
            method: sku.forecastMethod,
            baselineQty: Math.max(0, actualQty - eventUpliftQty),
            eventUpliftQty,
            factorAdjustmentQty: 0,
            consensusAdjustmentQty: 0,
            forecastQty,
            lowerQty,
            upperQty,
            sourceCalendarVersionId: 'CAL-2026-W33-V1',
            frozen: true,
            issuedAt: `${issuedWeek.weekStart}T00:00:00.000Z`,
            createdBy: 'system.seed',
            source: 'SEED',
            dataVersion: DATA_VERSION,
            generationSeed: GENERATION_SEED,
          }
          forecastVintages.push(forecast)
          const signedErrorQty = forecastQty - actualQty
          const absoluteErrorQty = Math.abs(signedErrorQty)
          forecastAccuracyHistory.push({
            accuracyId: `ACC-${forecastId}-${actualVersionId}`,
            forecastId,
            skuId: sku.id,
            channelId: distributor.id,
            distributorId: distributor.id,
            targetWeek: targetWeek.weekId,
            horizonWeeks,
            horizonBand,
            modelCode: sku.forecastMethod,
            forecastQty,
            actualQty,
            signedErrorQty,
            absoluteErrorQty,
            absolutePctError: actualQty === 0 ? null : round(absoluteErrorQty / actualQty, 4),
            accuracyPct: round(Math.max(0, 1 - absoluteErrorQty / Math.max(actualQty, 1)), 4),
            biasPct: round(signedErrorQty / Math.max(actualQty, 1), 4),
            actualVersionId,
            closedAt: `${isoAtDayOffset(targetWeek.weekStart, 7)}T00:00:00.000Z`,
            source: 'DERIVED',
            dataVersion: DATA_VERSION,
            generationSeed: GENERATION_SEED,
          })
        }
      }
    }
  }
  return { forecastVintages, forecastAccuracyHistory }
}

let _cache = null

// Hydrates the synchronous calculation layer from persisted collections.
// Routes call this only after a successful Mongo read; the deterministic
// generator remains the safety-net when Mongo is unavailable.
export function setDatasetFromStorage({ regions, distributors, skus, weeks, weekly } = {}) {
  if (!Array.isArray(weekly) || weekly.length === 0) return false
  if (Array.isArray(regions) && regions.length) REGIONS.splice(0, REGIONS.length, ...regions)
  if (Array.isArray(distributors) && distributors.length) DISTRIBUTORS.splice(0, DISTRIBUTORS.length, ...distributors)
  if (Array.isArray(skus) && skus.length) SKUS.splice(0, SKUS.length, ...skus)
  const storedWeeks = Array.isArray(weeks) ? weeks : []
  const planningWeeks = buildPlanningWeeks()
  const npiForecasts = buildNpiForecasts(weekly, planningWeeks)
  const demandListings = buildDemandListings()
  _cache = {
    meta: {
      generatedAt: GENERATED_AT,
      skuCount: SKUS.length,
      npiCount: NPI_PRODUCTS.length,
      distributorCount: DISTRIBUTORS.length,
      regionCount: REGIONS.length,
      weekCount: storedWeeks.length,
      planningWeekCount: planningWeeks.length,
      rowCount: weekly.length,
      source: 'mongodb',
      dataVersion: DATA_VERSION,
      generationSeed: GENERATION_SEED,
    },
    regions: REGIONS,
    distributors: DISTRIBUTORS,
    skus: SKUS,
    weeks: storedWeeks,
    planningWeeks,
    weekly,
    lifecycle: buildLifecycleRows(),
    npiProducts: npiForecasts,
    npiForecasts,
    npiReadinessItems: buildNpiReadinessItems(),
    eventTemplates: EVENT_TEMPLATES.map((row) => ({ ...row })),
    demandEvents: DEMAND_EVENTS.map((row) => ({ ...row })),
    events: DEMAND_EVENTS.map((row) => ({ ...row })),
    inventoryNorms: buildChannelInventoryNorms(weekly, storedWeeks),
    demandListings,
    demandChannelIntegrations: buildDemandChannelIntegrations(demandListings),
    ...buildConsensusWorkflowData(planningWeeks),
  }
  return true
}

export function getDataset() {
  if (!_cache) {
    const generated = generateDataset()
    _cache = {
      meta: {
        generatedAt: GENERATED_AT,
        skuCount: SKUS.length,
        npiCount: NPI_PRODUCTS.length,
        distributorCount: DISTRIBUTORS.length,
        regionCount: REGIONS.length,
        weekCount: generated.weeks.length,
        planningWeekCount: generated.planningWeeks.length,
        rowCount: generated.weekly.length,
        dataVersion: DATA_VERSION,
        generationSeed: GENERATION_SEED,
      },
      regions: REGIONS,
      distributors: DISTRIBUTORS,
      skus: SKUS,
      ...generated,
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
    if (sku.category === 'Neckbands' && last.weekNumber >= 24 && last.weekNumber <= 34) {
      scheme = { label: 'Back-to-campus cashback 6%', discountPct: 6 }
    } else if (sku.category === 'TWS Earbuds' && last.weekNumber >= 40) {
      scheme = { label: 'Festive combo bonus 5%', discountPct: 5 }
    } else if (sku.category === 'Smartwatches' && isHighDemand) {
      scheme = { label: 'Smartwatch bundle rebate 4%', discountPct: 4 }
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
