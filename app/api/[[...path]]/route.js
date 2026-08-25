import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import pathModule from 'path'
import {
  getDataset,
  setDatasetFromStorage,
  filterWeekly,
  aggregate,
  kpis,
  suggestOrders,
  buildDispatchVisibilityRows,
  buildDealerActivationGap,
  REGIONS,
  DISTRIBUTORS,
  SKUS,
  XYZ_CV_THRESHOLDS,
} from '@/lib/dummyData'
import { getDb, getOrdersCollection, handleMongoError } from '@/lib/mongodb'
import { getOverviewMetrics, getCapacityGapAnalysis, getPurchaseOrdersWorkbench, getOdmEmsMaster } from '@/lib/supplyChainService'
import { WORKFLOW_TYPES, demandAuditTrail, persistWorkflowSnapshot } from '@/lib/workflowAudit'
import { getCanonicalChannelInventoryNorms, saveCanonicalChannelInventoryNorm } from '@/lib/channelInventoryNorms'
import { applyDemandEvents, applyDemandFactorsAndEvents } from '@/lib/demandEvents'
import { summarizeStoredForecastAccuracy } from '@/lib/forecastAccuracy'
import { canonicalNpiRecord } from '@/lib/npiReadiness'
import { getPublishedScenarioContext, getScenarioCatalog, publishScenarioVersion } from '@/lib/scenarioPlanning'
import {
  applyLifecycleToInventoryQuantity,
  buildCanonicalLifecycleTransition,
  inventoryMultiplierForLifecycle,
  lifecycleRowFromCanonicalSku,
  normalizeLifecycleStage,
  resolveEffectiveLifecycle,
} from '@/lib/skuLifecycle'
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
// Demand Planning masters (POC server-memory persistence)
// -----------------------------------------------------------------------
let demandPlanningMasters = null
let dashboardReviewCycle = null
let inventoryPlanningPolicies = null
let persistedOrderRules = null

const DEMAND_COLLECTIONS = {
  channelIntegrations: 'demand_channel_integrations',
  listings: 'demand_listings',
  events: 'demand_events',
  consensusWorkflows: 'demand_consensus_workflows',
}

const collectionCache = new Map()
const CACHE_TTL_MS = 15000 // 15s TTL
let lastHydratedAt = 0

function invalidateRouteCache(collectionName) {
  if (collectionName) {
    collectionCache.delete(collectionName)
  } else {
    collectionCache.clear()
  }
  lastHydratedAt = 0
}

function readRouteJson(collectionName) {
  try {
    const file = pathModule.resolve(process.cwd(), 'output', `${collectionName}.json`)
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
  } catch {
    return []
  }
}

async function readPersistedCollection(collectionName) {
  const cached = collectionCache.get(collectionName)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  let data = null
  try {
    const db = await getDb()
    const rows = await db.collection(collectionName).find({}).project({ _id: 0 }).toArray()
    if (rows.length) data = rows
  } catch (error) {
    handleMongoError(error)
  }

  if (!data) {
    data = readRouteJson(collectionName)
  }

  collectionCache.set(collectionName, { data, timestamp: Date.now() })
  return data
}

async function hydratePersistedState(force = false) {
  if (!force && lastHydratedAt > 0 && Date.now() - lastHydratedAt < CACHE_TTL_MS) {
    return
  }

  const [regions, distributors, skus, weeks, weekly] = await Promise.all([
    readPersistedCollection('sop_regions'),
    readPersistedCollection('sop_distributors'),
    readPersistedCollection('sop_skus'),
    readPersistedCollection('sop_weeks'),
    readPersistedCollection('sop_weekly'),
  ])
  setDatasetFromStorage({ regions, distributors, skus, weeks, weekly })

  const demandRows = await Promise.all(Object.values(DEMAND_COLLECTIONS).map(readPersistedCollection))
  if (demandRows.every((rows) => rows.length > 0)) {
    demandPlanningMasters = Object.fromEntries(Object.keys(DEMAND_COLLECTIONS).map((key, idx) => [key, demandRows[idx]]))
  }
  const [reviewCycles, storedSessions, storedOrderRules] = await Promise.all([
    readPersistedCollection('dashboard_review_cycles'),
    readPersistedCollection('chat_sessions'),
    readPersistedCollection('order_rules'),
  ])
  if (reviewCycles.length) dashboardReviewCycle = reviewCycles[0]
  if (storedOrderRules.length) persistedOrderRules = storedOrderRules
  if (storedSessions.length) {
    chatSessions.clear()
    storedSessions.forEach((session) => chatSessions.set(session.sessionId, session))
  }

  lastHydratedAt = Date.now()
}

async function replacePersisted(collectionName, filter, value) {
  invalidateRouteCache(collectionName)
  try {
    const db = await getDb()
    const persisted = { ...value }
    delete persisted._id
    await db.collection(collectionName).replaceOne(filter, persisted, { upsert: true })
  } catch (error) {
    handleMongoError(error)
    console.warn(`MongoDB replace failed for ${collectionName}:`, error.message)
  }
}

async function syncDispatchRecords(orderId, distributorId, lines) {
  const db = await getDb()
  const collection = db.collection('dispatch_records')
  const skuIds = lines.map((line) => line.skuId)
  await collection.deleteMany({ orderId, skuId: { $nin: skuIds } })
  for (const line of lines) {
    const existing = await collection.findOne({ orderId, skuId: line.skuId })
    const dispatchedQty = Number(existing?.dispatchedQty || 0)
    const orderedQty = Number(line.qty || 0)
    const gap = Math.max(0, orderedQty - dispatchedQty)
    const status = gap === 0 ? 'Fully fulfilled' : dispatchedQty === 0 ? 'Pending' : 'Partial'
    await collection.replaceOne({ orderId, skuId: line.skuId }, {
      dispatchId: existing?.dispatchId || `DSP-${orderId}-${line.skuId}`,
      orderId,
      distributorId,
      skuId: line.skuId,
      skuName: line.skuName,
      orderedQty,
      dispatchedQty: Math.min(dispatchedQty, orderedQty),
      gap,
      status,
      fillRatePct: orderedQty ? Math.round(Math.min(dispatchedQty, orderedQty) / orderedQty * 1000) / 10 : 0,
      updatedAt: new Date().toISOString(),
    }, { upsert: true })
  }
}

function nextReviewAt(cadence, from = new Date()) {
  if (cadence === 'ON_DEMAND') return null
  const days = cadence === 'WEEKLY' ? 7 : cadence === 'FORTNIGHTLY' ? 14 : 30
  return new Date(from.getTime() + days * 86400000).toISOString()
}

function getDashboardReviewCycle() {
  if (!dashboardReviewCycle) {
    const now = new Date()
    dashboardReviewCycle = { cycleId: `SOP-${now.toISOString().slice(0, 10)}`, cadence: 'MONTHLY', status: 'OPEN', startedAt: now.toISOString(), nextReviewAt: nextReviewAt('MONTHLY', now), completedRoles: [], closedAt: null, closedBy: null, history: [] }
  }
  return dashboardReviewCycle
}

function serviceLevelZ(serviceLevelPct) {
  if (serviceLevelPct >= 99) return 2.33
  if (serviceLevelPct >= 98) return 2.05
  if (serviceLevelPct >= 97) return 1.88
  if (serviceLevelPct >= 95) return 1.65
  if (serviceLevelPct >= 90) return 1.28
  return 1.04
}

function enrichInventoryPolicy(row) {
  const effectiveSafetyStockUnits = row.overrideSafetyStockUnits ?? row.suggestedSafetyStockUnits
  const effectiveDos = row.overrideDos ?? row.suggestedDos
  const reorderPointUnits = Math.round(row.avgDailyDemand * row.leadTimeDays + effectiveSafetyStockUnits)
  const maxInventoryUnits = Math.round(row.avgDailyDemand * effectiveDos + effectiveSafetyStockUnits)
  const inventoryStatus = row.currentInventoryUnits < reorderPointUnits ? 'REORDER' : row.currentInventoryUnits > maxInventoryUnits * 1.25 ? 'EXCESS' : 'HEALTHY'
  return { ...row, effectiveSafetyStockUnits, effectiveDos, reorderPointUnits, maxInventoryUnits, inventoryStatus }
}

async function getInventoryPlanningPolicies() {
  const dataset = getDataset()
  const [odmEms, channelNorms, canonicalSkus, lifecycleHistory, calendarVersions] = await Promise.all([
    getOdmEmsMaster(),
    getCanonicalChannelInventoryNorms(),
    readPersistedCollection('sop_skus'),
    readPersistedCollection('lifecycle_transition_history'),
    readPersistedCollection('planning_calendar_versions'),
  ])
  const anchorWeek = calendarVersions[0]?.anchorWeekId || null
  const effectiveSkus = canonicalSkus.map((sku) => resolveEffectiveLifecycle(sku, lifecycleHistory, anchorWeek))
  const leadTimeBySku = new Map()
  odmEms.forEach((vendor) => (vendor.lines || []).forEach((line) => {
    const current = leadTimeBySku.get(line.skuCode)
    if (!current || line.leadTimeDays < current.leadTimeDays) leadTimeBySku.set(line.skuCode, {
      leadTimeDays: line.leadTimeDays,
      source: `${vendor.supplierName} · ${line.lineId}`,
      supplierName: vendor.supplierName,
      minimumOrderQuantity: Number(line.minimumOrderQuantity || 0),
      orderMultiple: Number(line.orderMultiple || 1),
    })
  }))

  const analytics = effectiveSkus.map((sku) => {
    const history = (dataset.weekly || []).filter((row) => row.skuId === sku.id).sort((a, b) => a.weekId.localeCompare(b.weekId))
    const weeklyTotals = new Map()
    history.forEach((row) => weeklyTotals.set(row.weekId, (weeklyTotals.get(row.weekId) || 0) + (row.tertiary || 0)))
    const demand = Array.from(weeklyTotals.values())
    const avgWeeklyDemand = demand.length ? demand.reduce((sum, value) => sum + value, 0) / demand.length : 0
    const stdDevWeeklyDemand = demand.length ? Math.sqrt(demand.reduce((sum, value) => sum + Math.pow(value - avgWeeklyDemand, 2), 0) / demand.length) : 0
    const demandCv = avgWeeklyDemand ? stdDevWeeklyDemand / avgWeeklyDemand : 0
    const consumptionValue = history.reduce((sum, row) => sum + (row.tertiary || 0) * (row.price || sku.price || 0), 0)
    const latestWeek = demand.length ? Array.from(weeklyTotals.keys()).sort().at(-1) : null
    const currentInventoryUnits = history.filter((row) => row.weekId === latestWeek).reduce((sum, row) => sum + (row.distributorStock || 0) + (row.retailStock || 0), 0)
    return { sku, applicableNorms: channelNorms.filter((norm) => norm.skuId === sku.id && norm.status === 'ACTIVE'), avgWeeklyDemand, stdDevWeeklyDemand, demandCv, consumptionValue, currentInventoryUnits }
  }).sort((a, b) => b.consumptionValue - a.consumptionValue)

  const totalValue = analytics.reduce((sum, row) => sum + row.consumptionValue, 0) || 1
  let cumulativeValue = 0
  inventoryPlanningPolicies = analytics.map((item) => {
    cumulativeValue += item.consumptionValue
    const cumulativePct = cumulativeValue / totalValue * 100
    const abcClass = cumulativePct <= 80 ? 'A' : cumulativePct <= 95 ? 'B' : 'C'
    const xyzClass = item.demandCv <= XYZ_CV_THRESHOLDS.X_MAX ? 'X' : item.demandCv <= XYZ_CV_THRESHOLDS.Y_MAX ? 'Y' : 'Z'
    const canonicalNorm = item.applicableNorms[0] || null
    const serviceLevelTargetPct = canonicalNorm ? Number(canonicalNorm.serviceLevelTarget ?? canonicalNorm.serviceLevel * 100) : (abcClass === 'A' ? 98 : abcClass === 'B' ? 95 : 90)
    const lead = leadTimeBySku.get(item.sku.id) || { leadTimeDays: 14, source: 'Supply Planning default lead time', supplierName: 'Unmapped supplier', minimumOrderQuantity: 0, orderMultiple: 1 }
    const avgDailyDemand = item.avgWeeklyDemand / 7
    const dailyStdDev = item.stdDevWeeklyDemand / Math.sqrt(7)
    const lifecycleMultiplier = inventoryMultiplierForLifecycle(item.sku.lifecycleStage)
    const baseSafetyStockUnits = canonicalNorm?.safetyStockQty ?? Math.ceil(serviceLevelZ(serviceLevelTargetPct) * dailyStdDev * Math.sqrt(lead.leadTimeDays))
    const suggestedSafetyStockUnits = applyLifecycleToInventoryQuantity(baseSafetyStockUnits, item.sku.lifecycleStage)
    const suggestedDos = canonicalNorm?.targetDos ?? Math.max(7, Math.min(90, Math.ceil(lead.leadTimeDays + (avgDailyDemand ? suggestedSafetyStockUnits / avgDailyDemand : 0))))
    return {
      policyId: `INV-${item.sku.id}`,
      skuId: item.sku.id,
      skuName: item.sku.name,
      category: item.sku.category,
      abcClass,
      xyzClass,
      segment: `${abcClass}${xyzClass}`,
      velocityClass: abcClass === 'A' ? 'FAST' : abcClass === 'B' ? 'MEDIUM' : 'SLOW',
      variabilityClass: xyzClass === 'X' ? 'STABLE' : xyzClass === 'Y' ? 'VARIABLE' : 'ERRATIC',
      consumptionValue: Math.round(item.consumptionValue),
      avgWeeklyDemand: Math.round(item.avgWeeklyDemand),
      avgDailyDemand,
      stdDevWeeklyDemand: Math.round(item.stdDevWeeklyDemand),
      demandCv: Number(item.demandCv.toFixed(3)),
      leadTimeDays: lead.leadTimeDays,
      leadTimeSource: lead.source,
      supplierName: lead.supplierName,
      minimumOrderQuantity: lead.minimumOrderQuantity,
      orderMultiple: lead.orderMultiple,
      serviceLevelTargetPct,
      baseSafetyStockUnits,
      lifecycleSafetyStockMultiplier: lifecycleMultiplier,
      suggestedSafetyStockUnits,
      overrideSafetyStockUnits: null,
      suggestedDos,
      overrideDos: canonicalNorm?.overrideDos ?? null,
      lifecycleStage: item.sku.lifecycleStage,
      forecastMethod: item.sku.forecastMethod,
      lifecycleTransitionId: item.sku.lifecycleTransitionId,
      lifecycleSourceCollection: item.sku.lifecycleSourceCollection,
      lifecycleHistoryCollection: item.sku.lifecycleHistoryCollection,
      channelNormIds: item.applicableNorms.map((norm) => norm.normId),
      channelNorms: item.applicableNorms,
      canonicalNormCollection: 'channel_inventory_norms',
      currentInventoryUnits: item.currentInventoryUnits,
      overrideReason: null,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system.optimizer',
      auditTrail: [],
    }
  })
  return inventoryPlanningPolicies
}

function roundProcurementQuantity(quantity, minimumOrderQuantity, orderMultiple) {
  if (quantity <= 0) return 0
  const minimum = Math.max(0, Number(minimumOrderQuantity) || 0)
  const multiple = Math.max(1, Number(orderMultiple) || 1)
  return Math.ceil(Math.max(quantity, minimum) / multiple) * multiple
}

async function buildInventoryPlanning(cadence = 'WEEKLY', assumptions = {}) {
  const normalizedCadence = ['WEEKLY', 'MONTHLY', 'ON_REQUEST'].includes(cadence) ? cadence : 'WEEKLY'
  const reviewDays = normalizedCadence === 'WEEKLY' ? 7 : normalizedCadence === 'MONTHLY' ? 30 : 0
  const demandAdjustmentPct = Math.max(-50, Math.min(100, Number(assumptions.demandAdjustmentPct) || 0))
  const dosAdjustmentDays = Math.max(-30, Math.min(60, Number(assumptions.dosAdjustmentDays) || 0))
  const inboundRealizationPct = Math.max(0, Math.min(120, Number(assumptions.inboundRealizationPct) || 100))
  const now = new Date()
  const policies = (await getInventoryPlanningPolicies()).map(enrichInventoryPolicy)
  const purchaseOrders = await getPurchaseOrdersWorkbench()
  const poBySku = new Map()
  purchaseOrders.forEach((po) => {
    const outstandingUnits = Math.max(0, Number(po.orderedQty || 0) - Number(po.receivedQty || 0))
    if (!outstandingUnits || ['CANCELLED', 'CLOSED'].includes(po.status)) return
    const rows = poBySku.get(po.skuCode) || []
    rows.push({ poNumber: po.poNumber, outstandingUnits, expectedDeliveryDate: po.expectedDeliveryDate, supplierName: po.supplierName, status: po.status })
    poBySku.set(po.skuCode, rows)
  })

  const recommendations = policies.map((policy) => {
    const openPos = poBySku.get(policy.skuId) || []
    const openPoUnits = openPos.reduce((sum, po) => sum + po.outstandingUnits, 0)
    const dueWithinLeadTimeUnits = openPos.filter((po) => {
      if (!po.expectedDeliveryDate) return false
      const days = (new Date(po.expectedDeliveryDate).getTime() - now.getTime()) / 86400000
      return days >= 0 && days <= policy.leadTimeDays
    }).reduce((sum, po) => sum + po.outstandingUnits, 0)
    const nextPoDueDate = openPos.map((po) => po.expectedDeliveryDate).filter(Boolean).sort()[0] || null
    const adjustedDailyDemand = policy.avgDailyDemand * (1 + demandAdjustmentPct / 100)
    const inventoryPositionUnits = policy.currentInventoryUnits + openPoUnits
    const targetCoverageDays = Math.max(policy.effectiveDos + dosAdjustmentDays, policy.leadTimeDays + reviewDays)
    const orderUpToUnits = Math.round(adjustedDailyDemand * targetCoverageDays + policy.effectiveSafetyStockUnits)
    const rawRecommendedOrderUnits = Math.max(0, orderUpToUnits - inventoryPositionUnits)
    const recommendedOrderUnits = roundProcurementQuantity(rawRecommendedOrderUnits, policy.minimumOrderQuantity, policy.orderMultiple)
    const daysUntilReorderPoint = adjustedDailyDemand ? Math.max(0, (inventoryPositionUnits - policy.reorderPointUnits) / adjustedDailyDemand) : 0
    const orderInDays = Math.max(0, Math.floor(daysUntilReorderPoint - policy.leadTimeDays))
    const recommendedOrderDate = new Date(now.getTime() + orderInDays * 86400000).toISOString().slice(0, 10)
    const projectedAtReceiptUnits = Math.round(policy.currentInventoryUnits + dueWithinLeadTimeUnits - adjustedDailyDemand * policy.leadTimeDays)
    return {
      ...policy,
      cadence: normalizedCadence,
      reviewDays,
      openPoCount: openPos.length,
      openPoUnits,
      dueWithinLeadTimeUnits,
      nextPoDueDate,
      inventoryPositionUnits,
      orderUpToUnits,
      recommendedOrderUnits,
      recommendedOrderDate,
      projectedAtReceiptUnits,
      recommendationStatus: recommendedOrderUnits > 0 ? (orderInDays === 0 ? 'ORDER_NOW' : 'PLANNED') : 'COVERED',
      recommendationReason: recommendedOrderUnits > 0
        ? `${normalizedCadence.replace('_', '-')} review: replenish to ${targetCoverageDays} days after ${openPoUnits.toLocaleString('en-IN')} open-PO units.`
        : `Inventory position and ${openPoUnits.toLocaleString('en-IN')} open-PO units cover the ${normalizedCadence.replace('_', '-')} review window.`,
    }
  }).sort((a, b) => b.recommendedOrderUnits - a.recommendedOrderUnits)

  const health = policies.map((policy) => {
    const recommendation = recommendations.find((row) => row.policyId === policy.policyId)
    const daysOfSupply = policy.avgDailyDemand ? policy.currentInventoryUnits / policy.avgDailyDemand : 999
    const flags = []
    if (recommendation.projectedAtReceiptUnits < policy.effectiveSafetyStockUnits) flags.push('STOCKOUT_RISK')
    if (policy.abcClass === 'C' && daysOfSupply > Math.max(90, policy.effectiveDos * 2)) flags.push('OBSOLETE_CANDIDATE')
    else if (policy.currentInventoryUnits > policy.maxInventoryUnits * 1.25) flags.push('EXCESS')
    if (daysOfSupply < policy.effectiveDos * 0.5 || daysOfSupply > policy.effectiveDos * 1.5) flags.push('DOS_OUTLIER')
    return {
      ...policy,
      daysOfSupply: Number(daysOfSupply.toFixed(1)),
      projectedAtReceiptUnits: recommendation.projectedAtReceiptUnits,
      openPoUnits: recommendation.openPoUnits,
      flags,
      primaryHealthStatus: flags[0] || 'HEALTHY',
      excessUnits: Math.max(0, policy.currentInventoryUnits - policy.maxInventoryUnits),
      stockoutExposureUnits: Math.max(0, policy.effectiveSafetyStockUnits - recommendation.projectedAtReceiptUnits),
    }
  })

  function simulateScenario(name, scenarioAssumptions) {
    const demandFactor = 1 + scenarioAssumptions.demandAdjustmentPct / 100
    const inboundFactor = scenarioAssumptions.inboundRealizationPct / 100
    const skuStates = policies.map((policy) => ({ policy, closing: policy.currentInventoryUnits }))
    let lostDemandUnits = 0
    const projection = Array.from({ length: 12 }, (_, index) => {
      const weekStart = new Date(now.getTime() + index * 7 * 86400000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
      let openingInventoryUnits = 0
      let inboundUnits = 0
      let demandUnits = 0
      let closingInventoryUnits = 0
      skuStates.forEach((state) => {
        const { policy } = state
        const opening = state.closing
        const poInbound = (poBySku.get(policy.skuId) || []).filter((po) => {
          const due = new Date(po.expectedDeliveryDate)
          return due >= weekStart && due < weekEnd
        }).reduce((sum, po) => sum + po.outstandingUnits, 0) * inboundFactor
        const targetDays = Math.max(0, policy.effectiveDos + scenarioAssumptions.dosAdjustmentDays)
        const desiredInventory = policy.avgDailyDemand * targetDays + policy.effectiveSafetyStockUnits
        const policyReplenishment = index === Math.max(0, Math.ceil(policy.leadTimeDays / 7) - 1) ? Math.max(0, desiredInventory - policy.currentInventoryUnits - (poBySku.get(policy.skuId) || []).reduce((sum, po) => sum + po.outstandingUnits * inboundFactor, 0)) : 0
        const inbound = poInbound + policyReplenishment
        const demand = policy.avgWeeklyDemand * demandFactor
        const available = opening + inbound
        const closing = Math.max(0, available - demand)
        lostDemandUnits += Math.max(0, demand - available)
        state.closing = closing
        openingInventoryUnits += opening
        inboundUnits += inbound
        demandUnits += demand
        closingInventoryUnits += closing
      })
      return { week: `W${index + 1}`, openingInventoryUnits: Math.round(openingInventoryUnits), inboundUnits: Math.round(inboundUnits), demandUnits: Math.round(demandUnits), closingInventoryUnits: Math.round(closingInventoryUnits) }
    })
    const averageInventoryUnits = Math.round(projection.reduce((sum, row) => sum + row.closingInventoryUnits, 0) / projection.length)
    return { name, assumptions: scenarioAssumptions, projection, summary: { averageInventoryUnits, endingInventoryUnits: projection.at(-1)?.closingInventoryUnits || 0, lostDemandUnits: Math.round(lostDemandUnits) } }
  }

  const customAssumptions = { demandAdjustmentPct, dosAdjustmentDays, inboundRealizationPct }
  const scenarios = [
    simulateScenario('Lean', { demandAdjustmentPct: 0, dosAdjustmentDays: -7, inboundRealizationPct: 90 }),
    simulateScenario('Baseline', { demandAdjustmentPct: 0, dosAdjustmentDays: 0, inboundRealizationPct: 100 }),
    simulateScenario('Resilient', { demandAdjustmentPct: 10, dosAdjustmentDays: 14, inboundRealizationPct: 100 }),
    simulateScenario('Custom', customAssumptions),
  ]

  return {
    generatedAt: now.toISOString(),
    cadence: normalizedCadence,
    nextReviewDate: normalizedCadence === 'ON_REQUEST' ? null : new Date(now.getTime() + reviewDays * 86400000).toISOString().slice(0, 10),
    recommendations,
    recommendationSummary: {
      totalRecommendedUnits: recommendations.reduce((sum, row) => sum + row.recommendedOrderUnits, 0),
      orderNowCount: recommendations.filter((row) => row.recommendationStatus === 'ORDER_NOW').length,
      plannedCount: recommendations.filter((row) => row.recommendationStatus === 'PLANNED').length,
      coveredCount: recommendations.filter((row) => row.recommendationStatus === 'COVERED').length,
    },
    health,
    healthSummary: {
      healthyCount: health.filter((row) => row.primaryHealthStatus === 'HEALTHY').length,
      stockoutRiskCount: health.filter((row) => row.flags.includes('STOCKOUT_RISK')).length,
      excessCount: health.filter((row) => row.flags.includes('EXCESS')).length,
      obsoleteCandidateCount: health.filter((row) => row.flags.includes('OBSOLETE_CANDIDATE')).length,
      dosOutlierCount: health.filter((row) => row.flags.includes('DOS_OUTLIER')).length,
      excessUnits: health.reduce((sum, row) => sum + row.excessUnits, 0),
      stockoutExposureUnits: health.reduce((sum, row) => sum + row.stockoutExposureUnits, 0),
    },
    scenarios,
  }
}

const CHANNEL_TYPES = ['ONLINE_MARKETPLACE', 'MODERN_TRADE_ONLINE', 'MODERN_TRADE_OFFLINE', 'QUICK_COMMERCE', 'D2C', 'GENERAL_TRADE', 'EXPORT', 'B2B']
const CHANNEL_SOURCES = ['API_PULL', 'WEBHOOK', 'EDI_SFTP', 'BRAND_PORTAL_EXPORT', 'INTERNAL_API', 'MANUAL_UPLOAD']
const CHANNEL_DATA_DOMAINS = ['TERTIARY_SALES', 'CHANNEL_STOCK', 'DOS', 'RETURNS']
const LISTING_STATUSES = ['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED', 'DELISTED']

function seedListingStatus(skuIdx, distIdx) {
  const seed = (skuIdx * 7 + distIdx * 3) % 10
  if (seed < 7) return 'ACTIVE'
  if (seed < 8) return 'PENDING_ACTIVATION'
  if (seed < 9) return 'SUSPENDED'
  return 'DELISTED'
}

function npiProjection(row) {
  if (Array.isArray(row.projection) && row.projection.length) return row.projection
  return Array.from({ length: 12 }, (_, idx) => {
    const progress = (idx + 1) / 12
    let factor = progress
    if (row.curveTemplate === 'S_CURVE') factor = 1 / (1 + Math.exp(-8 * (progress - 0.5)))
    if (row.curveTemplate === 'HOCKEY_STICK') factor = progress < 0.55 ? progress * 0.45 : 0.25 + ((progress - 0.55) / 0.45) * 0.75
    return { week: `Launch +${idx + 1}`, units: Math.round(row.peakWeeklyUnits * Math.min(1, factor)) }
  })
}

function npiRowFromCanonical(product, readinessItems, vintages) {
  const canonical = canonicalNpiRecord(product, readinessItems)
  const projection = vintages
    .filter((row) => row.skuId === product.skuId && row.targetWeek >= product.launchWeek)
    .sort((a, b) => a.targetWeek.localeCompare(b.targetWeek) || a.horizonWeeks - b.horizonWeeks)
    .filter((row, index, rows) => index === rows.findIndex((candidate) => candidate.targetWeek === row.targetWeek))
    .slice(0, product.rampWeeks || 12)
    .map((row) => ({ week: row.targetWeek, units: row.forecastQty, forecastId: row.forecastId }))
  return {
    ...canonical,
    skuName: product.productName,
    curveTemplate: product.rampCurve,
    peakWeeklyUnits: product.targetPeakWeeklyUnits,
    analogSkuId: product.analogSkuIds?.[0] || null,
    projection,
  }
}

const CONSENSUS_STEPS = [
  { status: 'CATEGORY_REVIEW', role: 'Category Manager', next: 'SALES_REVIEW' },
  { status: 'SALES_REVIEW', role: 'Sales Head', next: 'SOP_REVIEW' },
  { status: 'SOP_REVIEW', role: 'S&OP Lead', next: 'FINANCE_REVIEW' },
  { status: 'FINANCE_REVIEW', role: 'Finance', next: 'LOCKED' },
]

function getDemandPlanningMasters() {
  if (demandPlanningMasters) return demandPlanningMasters

  const sourceByTier = {
    A: { sourceType: 'EDI_SFTP', expectedCadenceHours: 4 },
    B: { sourceType: 'API_PULL', expectedCadenceHours: 8 },
    C: { sourceType: 'MANUAL_UPLOAD', expectedCadenceHours: 24 },
  }
  const channelTypes = ['GENERAL_TRADE', 'MODERN_TRADE_OFFLINE', 'ONLINE_MARKETPLACE', 'D2C', 'GENERAL_TRADE']
  const now = Date.now()
  const generatedDataset = getDataset()

  const channelIntegrations = DISTRIBUTORS.map((d, idx) => {
    const source = sourceByTier[d.tier] || sourceByTier.B
    const freshnessHours = d.tier === 'C' ? 36 : source.expectedCadenceHours - 1
    return {
      distributorId: d.id,
      distributorName: d.name,
      region: d.region,
      tier: d.tier,
      channelType: channelTypes[idx] || 'GENERAL_TRADE',
      sourceType: source.sourceType,
      expectedCadenceHours: source.expectedCadenceHours,
      dataDomains: idx === 2
        ? ['TERTIARY_SALES', 'CHANNEL_STOCK']
        : ['TERTIARY_SALES', 'CHANNEL_STOCK', 'DOS'],
      enabled: true,
      lastSyncAt: new Date(now - freshnessHours * 3600000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      updatedBy: 'system.seed',
    }
  })

  const listings = []
  SKUS.forEach((sku, skuIdx) => {
    DISTRIBUTORS.forEach((d, distIdx) => {
      const status = seedListingStatus(skuIdx, distIdx)
      listings.push({
        listingId: `LST-${sku.id}-${d.id}`,
        skuId: sku.id,
        skuName: sku.name,
        category: sku.category,
        distributorId: d.id,
        distributorName: d.name,
        region: d.region,
        status,
        effectiveDate: `2026-${String((distIdx % 6) + 1).padStart(2, '0')}-01`,
        delistingDate: status === 'DELISTED' ? '2026-07-31' : null,
        moq: 100,
        exclusivity: false,
        updatedAt: new Date(now).toISOString(),
        updatedBy: 'system.seed',
      })
    })
  })

  const lifecycle = generatedDataset.lifecycle.map((row) => ({ ...row }))
  const npiForecasts = generatedDataset.npiForecasts.map((row) => ({ ...row }))

  const events = generatedDataset.demandEvents.map((row) => ({ ...row }))
  const consensusWorkflows = generatedDataset.demandConsensusWorkflows.map((row) => ({ ...row }))

  demandPlanningMasters = { channelIntegrations, listings, lifecycle, npiForecasts, events, consensusWorkflows }
  return demandPlanningMasters
}

function enrichChannelIntegrations() {
  const masters = getDemandPlanningMasters()
  const weekly = getDataset().weekly || []
  const now = Date.now()
  return masters.channelIntegrations.map((row) => {
    const freshnessHours = Math.max(0, Math.round((now - new Date(row.lastSyncAt).getTime()) / 360000) / 10)
    const recordCount = weekly.filter((w) => w.distributorId === row.distributorId).length
    const activeListings = masters.listings.filter((l) => l.distributorId === row.distributorId && l.status === 'ACTIVE').length
    const healthStatus = !row.enabled ? 'DISABLED' : freshnessHours > row.expectedCadenceHours ? 'DEGRADED' : 'HEALTHY'
    const missingDomains = ['TERTIARY_SALES', 'CHANNEL_STOCK', 'DOS'].filter((domain) => !row.dataDomains.includes(domain))
    return {
      ...row,
      freshnessHours,
      recordCount,
      activeListings,
      healthStatus,
      gapFlag: healthStatus === 'DEGRADED'
        ? `Last feed exceeds the ${row.expectedCadenceHours}h cadence SLA.`
        : missingDomains.length
          ? `Missing feed coverage: ${missingDomains.join(', ')}.`
          : null,
    }
  })
}

async function buildDashboardPlanBalance() {
  const dataset = getDataset()
  const masters = getDemandPlanningMasters()
  const [overview, capacity, purchaseOrders, inventoryPolicies, activeScenario] = await Promise.all([
    getOverviewMetrics(),
    getCapacityGapAnalysis(null, { weekCount: 26 }),
    getPurchaseOrdersWorkbench(),
    getInventoryPlanningPolicies(),
    getPublishedScenarioContext(),
  ])
  const generatedAt = new Date()
  const supplyTrend = overview.demandVsSupplyTrend || []

  // Live Demand Planning signal: current secondary baseline, overwritten by the
  // latest workflow proposal/final consensus and then uplifted by active/planned events.
  const workflowBySkuWeek = new Map(masters.consensusWorkflows.map((row) => [`${row.skuId}|${row.planningWeek}`, row]))
  const forecastByWeek = new Map()
  ;(dataset.weekly || []).forEach((row) => {
    const workflow = workflowBySkuWeek.get(`${row.skuId}|${row.weekId}`)
    const base = workflow === undefined ? Number(row.secondary || 0) : Number(workflow.finalConsensusFcst ?? workflow.proposedConsensusFcst ?? 0) / Math.max(1, DISTRIBUTORS.length)
    const impact = workflow?.includesDemandEvents ? { adjustedQty: Math.round(base) } : applyDemandEvents(base, masters.events, { weekId: row.weekId, skuId: row.skuId, channelId: row.distributorId, category: row.category, regionIds: [row.regionId, row.region].filter(Boolean) })
    const currentForecast = impact.adjustedQty
    const current = forecastByWeek.get(row.weekId) || { sourceWeek: row.weekId, forecastUnits: 0, consensusUnits: 0, eventUpliftUnits: 0 }
    current.forecastUnits += currentForecast
    current.consensusUnits += Math.round(base)
    current.eventUpliftUnits += Math.max(0, currentForecast - Math.round(base))
    forecastByWeek.set(row.weekId, current)
  })
  const phase3Forecast = Array.from(forecastByWeek.values()).sort((a, b) => a.sourceWeek.localeCompare(b.sourceWeek))

  // Dated PO commitments are assigned to their actual expected receipt bucket.
  const poReceiptsByBucket = Array(26).fill(0)
  let openPoUnits = 0
  purchaseOrders.forEach((po) => {
    if (['CANCELLED', 'CLOSED', 'FULLY_RECEIVED'].includes(po.status)) return
    const outstanding = Math.max(0, Number(po.orderedQty || 0) - Number(po.receivedQty || 0))
    if (!outstanding) return
    openPoUnits += outstanding
    const dueAt = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : generatedAt
    const rawIndex = Number.isNaN(dueAt.getTime()) ? 0 : Math.floor((dueAt.getTime() - generatedAt.getTime()) / (7 * 86400000))
    const bucketIndex = Math.max(0, Math.min(25, rawIndex))
    poReceiptsByBucket[bucketIndex] += outstanding
  })

  const currentInventoryUnits = inventoryPolicies.reduce((sum, row) => sum + Number(row.currentInventoryUnits || 0), 0)
  const safetyStockUnits = inventoryPolicies.reduce((sum, row) => sum + Number(row.overrideSafetyStockUnits ?? row.suggestedSafetyStockUnits ?? 0), 0)
  let rollingInventoryUnits = currentInventoryUnits
  const scenarioWeeks = activeScenario?.weekly || []
  const rows = Array.from({ length: 26 }, (_, idx) => {
    const demand = phase3Forecast[idx % Math.max(phase3Forecast.length, 1)] || { sourceWeek: `Phase3-W${idx + 1}`, forecastUnits: 0 }
    const supply = supplyTrend[idx % Math.max(supplyTrend.length, 1)] || {}
    const cap = capacity[idx] || {}
    const scenarioWeek = scenarioWeeks[idx]
    const forecastUnits = scenarioWeek?.scenarioDemandQty ?? demand.forecastUnits
    const plannedProduction = scenarioWeek?.scenarioSupplyQty ?? supply.plannedProduction ?? Math.round((cap.plannedWorkload || 0) * 0.72)
    const plannedPurchase = scenarioWeek ? 0 : supply.plannedPurchase || Math.round((cap.plannedWorkload || 0) * 0.28)
    const operatingPlanUnits = plannedProduction + plannedPurchase
    const constrainedProduction = Math.min(plannedProduction, cap.ratedWeeklyCapacity || plannedProduction)
    const confirmedPoReceipts = scenarioWeek ? 0 : poReceiptsByBucket[idx]
    const netSupplyUnits = scenarioWeek?.scenarioSupplyQty ?? constrainedProduction + confirmedPoReceipts
    const gapUnits = netSupplyUnits - forecastUnits
    const openingInventoryUnits = scenarioWeek?.openingInventoryQty ?? rollingInventoryUnits
    const projectedInventoryUnits = scenarioWeek?.closingInventoryQty ?? Math.max(0, openingInventoryUnits + netSupplyUnits - forecastUnits)
    const unmetDemandUnits = scenarioWeek?.unmetDemandQty ?? Math.max(0, forecastUnits - openingInventoryUnits - netSupplyUnits)
    rollingInventoryUnits = projectedInventoryUnits
    const inventoryRisk = projectedInventoryUnits < safetyStockUnits
    return {
      bucket: `W${String(idx + 1).padStart(2, '0')}`,
      horizon: idx < 5 ? 'SHORT' : 'MEDIUM',
      planningWeek: scenarioWeek?.weekId || cap.week || supply.week || demand.sourceWeek,
      demandSourceWeek: demand.sourceWeek,
      forecastUnits,
      consensusUnits: scenarioWeek?.scenarioDemandQty ?? demand.consensusUnits ?? demand.forecastUnits,
      eventUpliftUnits: scenarioWeek ? Math.max(0, scenarioWeek.scenarioDemandQty - (demand.consensusUnits || demand.forecastUnits)) : demand.eventUpliftUnits || 0,
      netSupplyUnits,
      operatingPlanUnits,
      plannedProduction,
      plannedPurchase,
      constrainedProduction,
      confirmedPoReceipts,
      ratedCapacityUnits: cap.ratedWeeklyCapacity || 0,
      capacityUtilizationPct: Number(cap.utilizationPct || 0),
      gapUnits,
      openingInventoryUnits,
      projectedInventoryUnits,
      safetyStockUnits,
      unmetDemandUnits,
      status: unmetDemandUnits > 0 ? 'STOCKOUT' : inventoryRisk ? 'INVENTORY_RISK' : gapUnits < 0 ? 'DEFICIT' : gapUnits < forecastUnits * 0.05 ? 'TIGHT' : 'COVERED',
      sourceScenarioVersionId: activeScenario?.scenarioVersionId || null,
    }
  })
  const totalForecast = rows.reduce((sum, row) => sum + row.forecastUnits, 0)
  const totalNetSupply = rows.reduce((sum, row) => sum + row.netSupplyUnits, 0)
  return {
    rows,
    summary: {
      totalForecast,
      totalNetSupply,
      totalOperatingPlan: rows.reduce((sum, row) => sum + row.operatingPlanUnits, 0),
      coveragePct: totalForecast ? Number((totalNetSupply / totalForecast * 100).toFixed(1)) : 0,
      deficitUnits: rows.reduce((sum, row) => sum + row.unmetDemandUnits, 0),
      deficitWeeks: rows.filter((row) => ['STOCKOUT', 'INVENTORY_RISK', 'DEFICIT'].includes(row.status)).length,
      capacityRiskWeeks: rows.filter((row) => row.capacityUtilizationPct > 90).length,
      openPoUnits,
      currentInventoryUnits,
      safetyStockUnits,
      projectedEndingInventoryUnits: rows.at(-1)?.projectedInventoryUnits || 0,
      inventoryRiskWeeks: rows.filter((row) => row.projectedInventoryUnits < row.safetyStockUnits).length,
    },
    sources: {
      forecast: activeScenario ? `Published scenario ${activeScenario.scenarioVersionId} scenarioDemandQty` : 'Current Demand Planning secondary baseline + latest consensus workflow + active event uplifts',
      netSupply: activeScenario ? `Published scenario ${activeScenario.scenarioVersionId} scenarioSupplyQty` : 'Supply Planning constrained capacity + purchase commitments on expected delivery dates',
      operatingPlan: activeScenario ? `Consensus plan selected by sourceScenarioVersionId=${activeScenario.scenarioVersionId}` : 'Supply Planning planned production + planned purchase',
      inventory: activeScenario ? `Published scenario ${activeScenario.scenarioVersionId} opening/closing inventory` : 'Current Inventory Planning position aggregated from latest channel stock snapshots',
    },
    freshness: {
      generatedAt: generatedAt.toISOString(),
      demandUpdatedAt: masters.consensusWorkflows.map((row) => row.updatedAt).filter(Boolean).sort().at(-1) || null,
      supplyAsOf: generatedAt.toISOString(),
      inventoryUpdatedAt: inventoryPolicies.map((row) => row.updatedAt).filter(Boolean).sort().at(-1) || null,
      refreshSeconds: 30,
    },
    isLive: true,
    activeScenario: activeScenario ? { scenarioVersionId: activeScenario.scenarioVersionId, name: activeScenario.name, publishedAt: activeScenario.publishedAt } : null,
  }
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
  if (persistedOrderRules?.length) {
    const rule = persistedOrderRules.find((item) => raw >= Number(item.startDay || 1) && (item.endDay == null || raw <= Number(item.endDay)))
    if (rule) return { state: rule.state, label: rule.label, day: raw, maxDeltaPct: rule.maxDeltaPct, hint: `Day ${raw} of month · ${rule.label}` }
  }
  if (raw < 25) return { state: 'editable', label: 'Editable', day: raw, maxDeltaPct: null,
    hint: `Day ${raw} of month · fully editable until the 25th` }
  if (raw <= 28) return { state: 'restricted', label: 'Restricted', day: raw, maxDeltaPct: 10,
    hint: `Day ${raw} of month · edits limited to ±10% per line until the 28th` }
  return { state: 'locked', label: 'Locked', day: raw, maxDeltaPct: 0,
    hint: `Day ${raw} of month · order book frozen · approval required to amend` }
}

// Rebuild enriched lines (with scheme pricing) from raw {skuId, qty} inputs.
// Used by both POST /orders/place and PATCH /orders/update so behaviour is identical.
function enrichLines(distributorId, inputLines, storedSuggestion = null) {
  const suggestion = storedSuggestion || suggestOrders(distributorId)
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

  return `You are an S&OP AI analyst for a consumer audio and wearables enterprise (TWS earbuds, neckbands, smartwatches, and speakers). You provide crisp, executive-style answers grounded in the data below. You NEVER invent SKUs, distributors, numbers, or revenues that are not present in the context.

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
  await hydratePersistedState()
  const path = (params?.path || []).join('/')

  // ---- Health ----------------------------------------------------------
  if (path === '' || path === 'health') {
    return NextResponse.json({ status: 'ok', service: 'S&OP Demo API' })
  }

  // ---- Dataset endpoints ----------------------------------------------
  if (path === 'data/meta') return NextResponse.json(getDataset().meta)
  if (path === 'data/skus') return NextResponse.json(getDataset().skus)
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

  if (path === 'dashboard/plan-balance') {
    return NextResponse.json(await buildDashboardPlanBalance())
  }

  if (path === 'dashboard/review-cycle') {
    return NextResponse.json(getDashboardReviewCycle())
  }

  if (path === 'dashboard/alerts') {
    const jsonAlerts = readRouteJson('dashboard_alerts')
    try {
      const db = await getDb()
      if (jsonAlerts.length) {
        for (const alert of jsonAlerts) {
          await db.collection('dashboard_alerts').replaceOne({ alertId: alert.alertId }, alert, { upsert: true })
        }
      }
      const rows = await db.collection('dashboard_alerts').find({}).project({ _id: 0 }).sort({ occurredAt: -1 }).toArray()
      return NextResponse.json({ rows })
    } catch {
      return NextResponse.json({ rows: jsonAlerts })
    }
  }

  if (path === 'scenarios') {
    return NextResponse.json(await getScenarioCatalog({ includeActiveOutputs: true }))
  }

  if (path === 'demand/market-benchmarks') {
    return NextResponse.json({ rows: await readPersistedCollection('demand_market_benchmarks') })
  }

  if (path === 'demand/forecast-vintages') {
    const query = q(request)
    const rows = (await readPersistedCollection('forecast_vintages')).filter((row) => {
      if (query.horizonWeeks && Number(row.horizonWeeks) !== Number(query.horizonWeeks)) return false
      if (query.skuId && row.skuId !== query.skuId) return false
      if (query.channelId && row.channelId !== query.channelId) return false
      return true
    })
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/forecast-accuracy') {
    const query = q(request)
    const distributors = await readPersistedCollection('sop_distributors')
    const channelIdsForRegion = query.region
      ? distributors.filter((row) => row.region === query.region).map((row) => row.id)
      : null
    const rows = (await readPersistedCollection('forecast_accuracy_history')).filter((row) => {
      if (query.horizonWeeks && Number(row.horizonWeeks) !== Number(query.horizonWeeks)) return false
      if (query.skuId && row.skuId !== query.skuId) return false
      if (query.channelId && row.channelId !== query.channelId) return false
      if (channelIdsForRegion && !channelIdsForRegion.includes(row.channelId)) return false
      return true
    })
    return NextResponse.json({ count: rows.length, rows, summary: summarizeStoredForecastAccuracy(rows) })
  }

  if (path === 'demand/event-templates') {
    const rows = await readPersistedCollection('event_templates')
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/factor-config') {
    const rows = await readPersistedCollection('demand_factor_config')
    return NextResponse.json(rows[0] || {})
  }

  if (path === 'financial/config') {
    const rows = await readPersistedCollection('financial_planning_config')
    return NextResponse.json(rows[0] || {})
  }

  if (path === 'inventory/policies') {
    const rows = (await getInventoryPlanningPolicies()).map(enrichInventoryPolicy)
    return NextResponse.json({
      count: rows.length,
      rows,
      methodology: {
        segmentation: 'ABC by cumulative tertiary consumption value (80/15/5); XYZ by weekly-demand coefficient of variation (X <= 0.25, Y <= 0.50, Z > 0.50)',
        safetyStock: 'canonical norm or statistical base × effective SKU lifecycle multiplier from sop_skus/lifecycle_transition_history',
        demandSource: 'Demand Planning tertiary history aggregated to SKU-week',
        leadTimeSource: 'Supply Planning supplier-product lead time, with supplier/default fallback',
      },
    })
  }

  if (path === 'inventory/planning') {
    const query = q(request)
    return NextResponse.json(await buildInventoryPlanning(String(query.cadence || 'WEEKLY').toUpperCase(), {
      demandAdjustmentPct: query.demandAdjustmentPct,
      dosAdjustmentDays: query.dosAdjustmentDays,
      inboundRealizationPct: query.inboundRealizationPct,
    }))
  }

  if (path === 'demand/channel-integrations') {
    const rows = enrichChannelIntegrations()
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/listings') {
    const rows = getDemandPlanningMasters().listings
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/lifecycle') {
    const [skus, transitionHistory, calendarVersions] = await Promise.all([
      readPersistedCollection('sop_skus'),
      readPersistedCollection('lifecycle_transition_history'),
      readPersistedCollection('planning_calendar_versions'),
    ])
    const anchorWeek = calendarVersions[0]?.anchorWeekId || null
    const rows = skus.map((sku) => lifecycleRowFromCanonicalSku(sku, transitionHistory, anchorWeek))
    return NextResponse.json({ count: rows.length, rows, sourceCollection: 'sop_skus', historyCollection: 'lifecycle_transition_history', asOfWeek: anchorWeek })
  }

  if (path === 'demand/npi-forecasts') {
    const [products, readinessItems, vintages] = await Promise.all([
      readPersistedCollection('npi_products'),
      readPersistedCollection('npi_readiness_items'),
      readPersistedCollection('forecast_vintages'),
    ])
    const rows = products.map((product) => npiRowFromCanonical(product, readinessItems, vintages))
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/events') {
    const rows = await readPersistedCollection('demand_events')
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/inventory-norms') {
    const rows = await getCanonicalChannelInventoryNorms()
    return NextResponse.json({ count: rows.length, rows })
  }

  if (path === 'demand/consensus-workflows') {
    const subjects = getDemandPlanningMasters().consensusWorkflows
    const [instances, workflowSteps, auditEvents] = await Promise.all([
      readPersistedCollection('workflow_instances'),
      readPersistedCollection('workflow_steps'),
      readPersistedCollection('entity_audit_events'),
    ])
    const rows = subjects.map((subject) => ({
      ...subject,
      workflow: instances.find((row) => row.workflowId === subject.workflowId) || null,
      workflowSteps: workflowSteps.filter((row) => row.workflowId === subject.workflowId).sort((a, b) => a.stepSequence - b.stepSequence),
      auditTrail: demandAuditTrail(auditEvents.filter((row) => row.workflowId === subject.workflowId)),
    }))
    return NextResponse.json({ count: rows.length, rows, steps: CONSENSUS_STEPS })
  }

  // ---- Order endpoints -------------------------------------------------
  // GET /api/orders/suggest?distributorId=DST-001
  if (path === 'orders/suggest') {
    const { distributorId } = q(request)
    if (!distributorId) {
      return NextResponse.json({ error: 'distributorId required' }, { status: 400 })
    }
    const persistedSuggestions = await readPersistedCollection('order_suggestions')
    const suggestion = persistedSuggestions.find((row) => row.distributor?.id === distributorId || row.distributorId === distributorId) || suggestOrders(distributorId)
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
    const persistedGaps = await readPersistedCollection('dealer_activation_gaps')
    const payload = persistedGaps.find((row) => row.distributor?.id === distributorId || row.distributorId === distributorId) || buildDealerActivationGap(distributorId)
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
    const rows = await readPersistedCollection('chat_suggestions')
    const suggestions = rows.length ? rows.map((row) => row.question || row.text).filter(Boolean) : SUGGESTED_QUESTIONS
    return NextResponse.json({ count: suggestions.length, suggestions })
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
    const storedRules = await readPersistedCollection('order_rules')
    return NextResponse.json({
      lockState: computeLockState(simDay),
      rules: storedRules.length ? storedRules : [
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

    let dataSource = 'dispatch_records'
    let orderedInputs = []

    try {
      const storedDispatches = (await readPersistedCollection('dispatch_records')).filter((row) => row.distributorId === distributorId)
      if (storedDispatches.length) {
        const totalOrdered = storedDispatches.reduce((sum, row) => sum + Number(row.orderedQty || 0), 0)
        const totalDispatched = storedDispatches.reduce((sum, row) => sum + Number(row.dispatchedQty || 0), 0)
        const totalGap = totalOrdered - totalDispatched
        const byStatus = { 'Fully fulfilled': 0, Partial: 0, Pending: 0 }
        storedDispatches.forEach((row) => { byStatus[row.status] = (byStatus[row.status] || 0) + 1 })
        return NextResponse.json({
          distributorId,
          distributorName: distributor.name,
          region: distributor.region,
          tier: distributor.tier,
          dataSource,
          dataSourceHint: 'Read from persisted dispatch records.',
          summary: {
            skuLines: storedDispatches.length,
            totalOrdered,
            totalDispatched,
            totalGap,
            fulfilmentPct: totalOrdered ? Math.round((totalDispatched / totalOrdered) * 1000) / 10 : 0,
            byStatus,
          },
          rows: storedDispatches,
        })
      }
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
      if (orderedInputs.length) dataSource = 'placed_orders'
    } catch {
      orderedInputs = []
    }

    if (!orderedInputs.length) {
      const storedSuggestions = await readPersistedCollection('order_suggestions')
      const suggestion = storedSuggestions.find((row) => row.distributor?.id === distributorId || row.distributorId === distributorId) || suggestOrders(distributorId)
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
  await hydratePersistedState()
  const path = (params?.path || []).join('/')

  if (path === 'scenarios/publish') {
    const body = await request.json()
    if (!body?.scenarioVersionId) return NextResponse.json({ error: 'scenarioVersionId is required' }, { status: 400 })
    try {
      return NextResponse.json(await publishScenarioVersion({ scenarioVersionId: body.scenarioVersionId, actor: body.actor }))
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('not found') ? 404 : 409 })
    }
  }

  if (path === 'demand/events') {
    const body = await request.json()
    if (!body?.eventName || !body?.startWeek || !body?.endWeek) return NextResponse.json({ error: 'eventName, startWeek and endWeek are required' }, { status: 400 })
    if (body.endWeek < body.startWeek) return NextResponse.json({ error: 'endWeek cannot precede startWeek' }, { status: 400 })
    if (body.affectedSkus?.some((skuId) => !SKUS.some((sku) => sku.id === skuId))) return NextResponse.json({ error: 'Unknown affected SKU' }, { status: 400 })
    if (body.affectedChannels?.some((channelId) => !DISTRIBUTORS.some((d) => d.id === channelId))) return NextResponse.json({ error: 'Unknown affected channel' }, { status: 400 })
    const row = {
      eventId: `EVT-${uuidv4().slice(0, 8).toUpperCase()}`,
      eventTemplateId: body.eventTemplateId || null,
      eventName: body.eventName,
      name: body.eventName,
      eventType: body.eventType || 'PROMOTIONAL',
      startWeek: body.startWeek,
      endWeek: body.endWeek,
      affectedSkus: Array.isArray(body.affectedSkus) ? body.affectedSkus : [],
      affectedChannels: Array.isArray(body.affectedChannels) ? body.affectedChannels : [],
      skuIds: Array.isArray(body.affectedSkus) ? body.affectedSkus : [],
      channelIds: Array.isArray(body.affectedChannels) ? body.affectedChannels : [],
      categories: Array.isArray(body.categories) ? body.categories : [],
      regionIds: Array.isArray(body.regionIds) ? body.regionIds : [],
      upliftPercent: Math.max(-100, Math.min(500, Number(body.upliftPercent) || 0)),
      upliftPct: Math.max(-1, Math.min(5, Number(body.upliftPercent) / 100 || 0)),
      upliftShape: body.upliftShape || 'FLAT',
      stackingGroup: body.stackingGroup || 'CUSTOM',
      maxStackedUpliftPct: Number(body.maxStackedUpliftPct || 1),
      status: body.status || 'PLANNED',
      actualUpliftPercent: null,
      effectiveFromWeek: body.startWeek,
      effectiveToWeek: body.endWeek,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'category.manager@boat.com',
      source: 'USER',
    }
    getDemandPlanningMasters().events.push(row)
    await replacePersisted('demand_events', { eventId: row.eventId }, row)
    return NextResponse.json({ ok: true, row }, { status: 201 })
  }

  if (path === 'demand/factor-adjusted-demand') {
    const body = await request.json()
    const skuId = body?.skuId
    const sku = getDataset().skus.find((item) => item.id === skuId)
    if (!sku) return NextResponse.json({ error: 'Unknown skuId' }, { status: 404 })

    const [events, weekly, factorConfigs] = await Promise.all([
      readPersistedCollection('demand_events'),
      readPersistedCollection('sop_weekly'),
      readPersistedCollection('demand_factor_config'),
    ])
    const byWeek = new Map()
    weekly.filter((row) => row.skuId === skuId).forEach((row) => {
      const impact = applyDemandFactorsAndEvents(row.secondary, events, {
        weekId: row.weekId,
        weekStart: row.weekStart,
        skuId: row.skuId,
        channelId: row.distributorId,
        category: row.category,
        lifecycleStage: row.lifecycleStage || sku.lifecycleStage,
        region: row.region,
        regionIds: [row.regionId, row.region].filter(Boolean),
      }, factorConfigs[0] || {}, { plc: true, seasonality: true, promotions: true, location: false })
      const line = byWeek.get(row.weekId) || { weekId: row.weekId, baseQty: 0, proposedQty: 0, appliedEventIds: new Set() }
      line.baseQty += Number(row.secondary || 0)
      line.proposedQty += impact.adjustedQty
      impact.appliedEventIds.forEach((eventId) => line.appliedEventIds.add(eventId))
      byWeek.set(row.weekId, line)
    })
    const lines = Array.from(byWeek.values())
      .filter((line) => line.appliedEventIds.size > 0)
      .sort((a, b) => a.weekId.localeCompare(b.weekId))
      .map((line) => ({
        weekId: line.weekId,
        baseQty: line.baseQty,
        proposedQty: line.proposedQty,
        netAdjustmentQty: line.proposedQty - line.baseQty,
        factorIds: ['DEMAND_EVENT'],
        appliedEventIds: Array.from(line.appliedEventIds),
      }))
    if (!lines.length) return NextResponse.json({ error: 'No canonical demand events apply to this SKU in the available demand horizon' }, { status: 409 })

    const db = await getDb()
    const now = new Date().toISOString()
    const proposalId = `FDP-${skuId}-${Date.now()}`
    const proposal = {
      proposalId,
      sourceForecastVersionId: 'SOP-WEEKLY-SECONDARY',
      scenarioVersionId: null,
      status: 'APPROVED',
      authorUserId: 'demand.planner@boat.com',
      submittedAt: now,
      approvedAt: now,
      comment: 'Canonical demand-event adjustment published by Demand Factors into consensus.',
      lines,
      source: 'USER',
      updatedAt: now,
    }
    await db.collection('factor_adjusted_demand_proposals').replaceOne({ proposalId }, proposal, { upsert: true })

    let publishedWeeks = 0
    const skippedLockedWeeks = []
    for (const line of lines) {
      const workflowId = `DCW-${skuId}-${line.weekId}`
      const existing = await db.collection('demand_consensus_workflows').findOne({ workflowId })
      if (existing?.status === 'LOCKED') {
        skippedLockedWeeks.push(line.weekId)
        continue
      }
      const subject = {
        ...(existing || {}),
        workflowId,
        skuId,
        skuName: sku.name,
        planningWeek: line.weekId,
        horizonType: 'SHORT',
        statisticalFcst: line.baseQty,
        channelSubmittedFcst: line.baseQty,
        proposedConsensusFcst: line.proposedQty,
        finalConsensusFcst: null,
        status: existing?.status || 'CATEGORY_REVIEW',
        currentStepOwner: existing?.currentStepOwner || 'Category Manager',
        sourceProposalId: proposalId,
        appliedEventIds: line.appliedEventIds,
        includesDemandEvents: true,
        updatedAt: now,
        updatedBy: 'demand.planner@boat.com',
        source: 'USER',
      }
      delete subject._id
      await db.collection('demand_consensus_workflows').replaceOne({ workflowId }, subject, { upsert: true })
      if (!existing) {
        await db.collection('workflow_instances').replaceOne({ workflowId }, {
          workflowId, workflowType: WORKFLOW_TYPES.DEMAND_CONSENSUS, subjectType: 'DEMAND_FORECAST', subjectId: `${skuId}|${line.weekId}`,
          sourceVersionId: proposalId, status: 'CATEGORY_REVIEW', currentStep: 1, dueAt: null, lockedAt: null, createdAt: now, updatedAt: now, source: 'USER',
        }, { upsert: true })
        for (let index = 0; index < CONSENSUS_STEPS.length; index += 1) {
          const step = CONSENSUS_STEPS[index]
          await db.collection('workflow_steps').replaceOne({ workflowId, stepSequence: index + 1 }, {
            workflowId, stepSequence: index + 1, stepCode: step.status, assignedRole: step.role, assignedUserId: null,
            status: index === 0 ? 'IN_PROGRESS' : 'PENDING', decision: null, comment: null, actedAt: null, createdAt: now, updatedAt: now, source: 'USER',
          }, { upsert: true })
        }
      }
      const memoryIndex = getDemandPlanningMasters().consensusWorkflows.findIndex((row) => row.workflowId === workflowId)
      if (memoryIndex >= 0) getDemandPlanningMasters().consensusWorkflows[memoryIndex] = subject
      else getDemandPlanningMasters().consensusWorkflows.push(subject)
      publishedWeeks += 1
    }
    return NextResponse.json({ ok: true, proposalId, publishedWeeks, skippedLockedWeeks, lines })
  }

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
      await replacePersisted('chat_sessions', { sessionId: session.sessionId }, session)

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
      if (sessionId && chatSessions.has(sessionId)) {
        chatSessions.delete(sessionId)
        const db = await getDb()
        await db.collection('chat_sessions').deleteOne({ sessionId })
      }
      const fresh = getOrCreateSession(null)
      await replacePersisted('chat_sessions', { sessionId: fresh.sessionId }, fresh)
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
      const built = enrichLines(distributorId, lines, suggestion)

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
      await syncDispatchRecords(orderDoc.orderId, distributorId, built.lines)

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
  await hydratePersistedState()
  const path = (params?.path || []).join('/')

  if (path === 'inventory/policies') {
    const body = await request.json()
    const { policyId, overrideDos, overrideSafetyStockUnits, serviceLevelTargetPct, overrideReason } = body || {}
    const policies = await getInventoryPlanningPolicies()
    const row = policies.find((item) => item.policyId === policyId)
    if (!row) return NextResponse.json({ error: 'Unknown inventory policy' }, { status: 404 })

    const nextServiceLevel = Number(serviceLevelTargetPct ?? row.serviceLevelTargetPct)
    const nextDos = overrideDos === null || overrideDos === '' || overrideDos === undefined ? null : Number(overrideDos)
    const nextSafetyStock = overrideSafetyStockUnits === null || overrideSafetyStockUnits === '' || overrideSafetyStockUnits === undefined ? null : Number(overrideSafetyStockUnits)
    if (!Number.isFinite(nextServiceLevel) || nextServiceLevel < 80 || nextServiceLevel > 99.9) return NextResponse.json({ error: 'Service level must be between 80% and 99.9%' }, { status: 400 })
    if (nextDos !== null && (!Number.isInteger(nextDos) || nextDos < 0 || nextDos > 180)) return NextResponse.json({ error: 'DOS override must be a whole number between 0 and 180' }, { status: 400 })
    if (nextSafetyStock !== null && (!Number.isInteger(nextSafetyStock) || nextSafetyStock < 0 || nextSafetyStock > 10_000_000)) return NextResponse.json({ error: 'Safety-stock override must be a non-negative whole number' }, { status: 400 })

    const changed = nextServiceLevel !== row.serviceLevelTargetPct || nextDos !== row.overrideDos || nextSafetyStock !== row.overrideSafetyStockUnits
    if (changed && !String(overrideReason || '').trim()) return NextResponse.json({ error: 'A reason is required for policy changes' }, { status: 400 })

    const before = enrichInventoryPolicy(row)
    row.serviceLevelTargetPct = nextServiceLevel
    const dailyStdDev = row.stdDevWeeklyDemand / Math.sqrt(7)
    row.suggestedSafetyStockUnits = Math.ceil(serviceLevelZ(nextServiceLevel) * dailyStdDev * Math.sqrt(row.leadTimeDays))
    row.suggestedDos = Math.max(7, Math.min(90, Math.ceil(row.leadTimeDays + (row.avgDailyDemand ? row.suggestedSafetyStockUnits / row.avgDailyDemand : 0))))
    row.overrideDos = nextDos
    row.overrideSafetyStockUnits = nextSafetyStock
    row.overrideReason = String(overrideReason || '').trim() || null
    row.updatedAt = new Date().toISOString()
    row.updatedBy = 'inventory.planner@boat.com'
    if (changed) row.auditTrail.push({
      at: row.updatedAt,
      actor: row.updatedBy,
      reason: row.overrideReason,
      before: { serviceLevelTargetPct: before.serviceLevelTargetPct, effectiveDos: before.effectiveDos, effectiveSafetyStockUnits: before.effectiveSafetyStockUnits },
      after: { serviceLevelTargetPct: row.serviceLevelTargetPct, effectiveDos: row.overrideDos ?? row.suggestedDos, effectiveSafetyStockUnits: row.overrideSafetyStockUnits ?? row.suggestedSafetyStockUnits },
    })
    await replacePersisted('inventory_policies', { policyId: row.policyId }, row)
    return NextResponse.json({ ok: true, row: enrichInventoryPolicy(row) })
  }

  if (path === 'dashboard/review-cycle') {
    const body = await request.json()
    const { action, actorRole, cadence } = body || {}
    const roles = ['Production', 'Sourcing', 'S&OP', 'NPI', 'Category', 'Sales', 'Finance']
    const cycle = getDashboardReviewCycle()
    if (!roles.includes(actorRole)) return NextResponse.json({ error: 'Invalid actorRole' }, { status: 400 })
    const now = new Date()
    const record = (event, detail) => cycle.history.push({ event, detail, actorRole, at: now.toISOString() })
    if (action === 'set_cadence') {
      if (!['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ON_DEMAND'].includes(cadence)) return NextResponse.json({ error: 'Invalid cadence' }, { status: 400 })
      cycle.cadence = cadence
      cycle.nextReviewAt = nextReviewAt(cadence, now)
      record('CADENCE_CHANGED', cadence)
    } else if (action === 'mark_reviewed') {
      if (cycle.status === 'CLOSED') return NextResponse.json({ error: 'Closed cycles cannot accept reviews' }, { status: 409 })
      if (!cycle.completedRoles.includes(actorRole)) cycle.completedRoles.push(actorRole)
      cycle.status = 'IN_REVIEW'
      record('ROLE_REVIEWED', actorRole)
    } else if (action === 'close_cycle') {
      if (actorRole !== 'S&OP') return NextResponse.json({ error: 'Only S&OP can close a review cycle' }, { status: 403 })
      cycle.status = 'CLOSED'
      cycle.closedAt = now.toISOString()
      cycle.closedBy = actorRole
      record('CYCLE_CLOSED', `${cycle.completedRoles.length}/${roles.length} roles reviewed`)
    } else if (action === 'open_cycle') {
      if (actorRole !== 'S&OP') return NextResponse.json({ error: 'Only S&OP can open a review cycle' }, { status: 403 })
      cycle.cycleId = `SOP-${now.toISOString().replaceAll(/[:.]/g, '-')}`
      cycle.status = 'OPEN'
      cycle.startedAt = now.toISOString()
      cycle.completedRoles = []
      cycle.closedAt = null
      cycle.closedBy = null
      cycle.nextReviewAt = nextReviewAt(cycle.cadence, now)
      record('CYCLE_OPENED', cycle.cadence)
    } else {
      return NextResponse.json({ error: 'Unknown review-cycle action' }, { status: 400 })
    }
    await replacePersisted('dashboard_review_cycles', { cycleId: cycle.cycleId }, cycle)
    return NextResponse.json({ ok: true, row: cycle })
  }

  if (path === 'demand/channel-integrations') {
    const body = await request.json()
    const { distributorId, action, ...changes } = body || {}
    const masters = getDemandPlanningMasters()
    const row = masters.channelIntegrations.find((item) => item.distributorId === distributorId)
    if (!row) return NextResponse.json({ error: 'Unknown distributorId' }, { status: 404 })
    if (changes.channelType !== undefined && !CHANNEL_TYPES.includes(changes.channelType)) return NextResponse.json({ error: 'Invalid channelType' }, { status: 400 })
    if (changes.sourceType !== undefined && !CHANNEL_SOURCES.includes(changes.sourceType)) return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    if (changes.dataDomains !== undefined && (!Array.isArray(changes.dataDomains) || changes.dataDomains.some((domain) => !CHANNEL_DATA_DOMAINS.includes(domain)))) return NextResponse.json({ error: 'Invalid dataDomains' }, { status: 400 })
    const allowed = ['channelType', 'sourceType', 'expectedCadenceHours', 'dataDomains', 'enabled']
    allowed.forEach((field) => {
      if (changes[field] !== undefined) row[field] = changes[field]
    })
    if (action === 'mark_received') row.lastSyncAt = new Date().toISOString()
    row.expectedCadenceHours = Math.max(1, Number(row.expectedCadenceHours) || 24)
    row.updatedAt = new Date().toISOString()
    row.updatedBy = 'demand.planner@boat.com'
    await replacePersisted('demand_channel_integrations', { distributorId }, row)
    return NextResponse.json({ ok: true, row: enrichChannelIntegrations().find((item) => item.distributorId === distributorId) })
  }

  if (path === 'demand/listings') {
    const body = await request.json()
    const { listingId, ...changes } = body || {}
    const masters = getDemandPlanningMasters()
    const row = masters.listings.find((item) => item.listingId === listingId)
    if (!row) return NextResponse.json({ error: 'Unknown listingId' }, { status: 404 })
    if (changes.status !== undefined && !LISTING_STATUSES.includes(changes.status)) return NextResponse.json({ error: 'Invalid listing status' }, { status: 400 })
    const effectiveDate = changes.effectiveDate ?? row.effectiveDate
    const delistingDate = changes.delistingDate ?? row.delistingDate
    if (effectiveDate && delistingDate && delistingDate < effectiveDate) return NextResponse.json({ error: 'De-listing date cannot precede the effective date' }, { status: 400 })
    const allowed = ['status', 'effectiveDate', 'delistingDate', 'region', 'moq', 'exclusivity']
    allowed.forEach((field) => {
      if (changes[field] !== undefined) row[field] = changes[field]
    })
    row.moq = Math.max(0, Math.round(Number(row.moq) || 0))
    if (row.status === 'DELISTED' && !row.delistingDate) row.delistingDate = new Date().toISOString().slice(0, 10)
    row.updatedAt = new Date().toISOString()
    row.updatedBy = 'sales.operations@boat.com'
    await replacePersisted('demand_listings', { listingId }, row)
    return NextResponse.json({ ok: true, row })
  }

  if (path === 'demand/lifecycle') {
    const body = await request.json()
    const { skuId, stage } = body || {}
    const newStage = normalizeLifecycleStage(stage)
    if (!newStage) return NextResponse.json({ error: 'Invalid lifecycle stage' }, { status: 400 })
    const db = await getDb()
    const storedSku = await db.collection('sop_skus').findOne({ $or: [{ id: skuId }, { skuId }, { skuCode: skuId }] })
    if (!storedSku) return NextResponse.json({ error: 'Unknown skuId' }, { status: 404 })
    const anchorWeek = (await readPersistedCollection('planning_calendar_versions'))[0]?.anchorWeekId || '2026-W33'
    const occurredAt = new Date().toISOString()
    if (normalizeLifecycleStage(storedSku.lifecycleStage) === newStage) {
      const history = await db.collection('lifecycle_transition_history').find({ skuId }).project({ _id: 0 }).toArray()
      return NextResponse.json({ ok: true, unchanged: true, row: lifecycleRowFromCanonicalSku(storedSku, history, anchorWeek) })
    }
    const transitionId = `LCT-${skuId}-${anchorWeek}-${newStage}-${uuidv4().slice(0, 8)}`
    const { nextSku, transition } = buildCanonicalLifecycleTransition({
      sku: storedSku,
      stage: newStage,
      effectiveWeek: anchorWeek,
      occurredAt,
      actorUserId: 'category.manager@boat.com',
      actorRole: 'Category Manager',
      transitionId,
    })
    delete nextSku._id
    await db.collection('lifecycle_transition_history').insertOne(transition)
    await db.collection('lifecycle_transition_history').updateMany({ skuId, transitionId: { $ne: transitionId }, effectiveToWeek: null }, { $set: { effectiveToWeek: anchorWeek } })
    await db.collection('sop_skus').replaceOne({ _id: storedSku._id }, nextSku)
    inventoryPlanningPolicies = null
    return NextResponse.json({ ok: true, row: lifecycleRowFromCanonicalSku(nextSku, [transition], anchorWeek), transition })
  }

  if (path === 'demand/npi-forecasts') {
    const body = await request.json()
    const { npiId, ...changes } = body || {}
    const row = (await readPersistedCollection('npi_products')).find((item) => item.npiId === npiId)
    if (!row) return NextResponse.json({ error: 'Unknown npiId' }, { status: 404 })
    if (changes.launchWeek !== undefined && !/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(changes.launchWeek)) return NextResponse.json({ error: 'launchWeek must use YYYY-Www format with week 01-53' }, { status: 400 })
    if (changes.curveTemplate !== undefined && !['S_CURVE', 'LINEAR', 'HOCKEY_STICK'].includes(changes.curveTemplate)) return NextResponse.json({ error: 'Invalid curveTemplate' }, { status: 400 })
    if (changes.analogSkuId !== undefined && !SKUS.some((sku) => sku.id === changes.analogSkuId)) return NextResponse.json({ error: 'Unknown analogSkuId' }, { status: 400 })
    if (changes.launchWeek !== undefined) row.launchWeek = changes.launchWeek
    if (changes.curveTemplate !== undefined) row.rampCurve = changes.curveTemplate
    if (changes.peakWeeklyUnits !== undefined) row.targetPeakWeeklyUnits = Math.max(0, Math.round(Number(changes.peakWeeklyUnits) || 0))
    if (changes.analogSkuId !== undefined) row.analogSkuIds = [changes.analogSkuId, ...(row.analogSkuIds || []).filter((id) => id !== changes.analogSkuId)].slice(0, 3)
    if (changes.cannibalizationRatePct !== undefined) row.cannibalizationRatePct = Math.max(0, Math.min(100, Number(changes.cannibalizationRatePct) || 0))
    row.updatedAt = new Date().toISOString()
    row.source = 'USER'
    await replacePersisted('npi_products', { npiId }, row)
    const [items, vintages] = await Promise.all([readPersistedCollection('npi_readiness_items'), readPersistedCollection('forecast_vintages')])
    return NextResponse.json({ ok: true, row: npiRowFromCanonical(row, items, vintages) })
  }

  if (path === 'demand/events') {
    const body = await request.json()
    const { eventId, ...changes } = body || {}
    const row = getDemandPlanningMasters().events.find((item) => item.eventId === eventId)
    if (!row) return NextResponse.json({ error: 'Unknown eventId' }, { status: 404 })
    if (changes.status !== undefined && !['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(changes.status)) return NextResponse.json({ error: 'Invalid event status' }, { status: 400 })
    const startWeek = changes.startWeek ?? row.startWeek
    const endWeek = changes.endWeek ?? row.endWeek
    if (endWeek < startWeek) return NextResponse.json({ error: 'endWeek cannot precede startWeek' }, { status: 400 })
    const allowed = ['eventName', 'eventType', 'startWeek', 'endWeek', 'affectedSkus', 'affectedChannels', 'categories', 'regionIds', 'upliftPercent', 'upliftShape', 'stackingGroup', 'maxStackedUpliftPct', 'actualUpliftPercent', 'status']
    allowed.forEach((field) => { if (changes[field] !== undefined) row[field] = changes[field] })
    row.upliftPercent = Math.max(-100, Math.min(500, Number(row.upliftPercent) || 0))
    row.upliftPct = row.upliftPercent / 100
    row.skuIds = Array.isArray(row.affectedSkus) ? row.affectedSkus : []
    row.channelIds = Array.isArray(row.affectedChannels) ? row.affectedChannels : []
    row.name = row.eventName
    row.effectiveFromWeek = row.startWeek
    row.effectiveToWeek = row.endWeek
    if (row.actualUpliftPercent !== null) row.actualUpliftPercent = Number(row.actualUpliftPercent)
    row.updatedAt = new Date().toISOString()
    row.updatedBy = 'category.manager@boat.com'
    await replacePersisted('demand_events', { eventId }, row)
    return NextResponse.json({ ok: true, row })
  }

  if (path === 'demand/inventory-norms') {
    const body = await request.json()
    const { normId, overrideDos, overrideReason } = body || {}
    const row = (await getCanonicalChannelInventoryNorms()).find((item) => item.normId === normId)
    if (!row) return NextResponse.json({ error: 'Unknown normId' }, { status: 404 })
    if (overrideDos !== null && (!Number.isFinite(Number(overrideDos)) || Number(overrideDos) < 0 || Number(overrideDos) > 180)) return NextResponse.json({ error: 'overrideDos must be between 0 and 180 days' }, { status: 400 })
    row.overrideDos = overrideDos === null ? null : Math.round(Number(overrideDos))
    row.overrideReason = row.overrideDos === null ? null : (overrideReason || 'Planner override')
    row.updatedAt = new Date().toISOString()
    row.updatedBy = 'inventory.planner@boat.com'
    row.source = 'USER'
    return NextResponse.json({ ok: true, row: await saveCanonicalChannelInventoryNorm(row) })
  }

  if (path === 'demand/consensus-workflows') {
    const body = await request.json()
    const { workflowId, action, actorRole, reason } = body || {}
    const row = getDemandPlanningMasters().consensusWorkflows.find((item) => item.workflowId === workflowId)
    if (!row) return NextResponse.json({ error: 'Unknown workflowId' }, { status: 404 })
    if (row.status === 'LOCKED') return NextResponse.json({ error: 'Locked consensus forecasts cannot be changed' }, { status: 409 })
    const [instances, storedSteps, storedEvents] = await Promise.all([
      readPersistedCollection('workflow_instances'),
      readPersistedCollection('workflow_steps'),
      readPersistedCollection('entity_audit_events'),
    ])
    const instance = instances.find((item) => item.workflowId === workflowId)
    const workflowSteps = storedSteps.filter((item) => item.workflowId === workflowId).sort((a, b) => a.stepSequence - b.stepSequence)
    if (!instance || workflowSteps.length !== 4) return NextResponse.json({ error: 'Shared workflow state is missing' }, { status: 409 })
    const currentWorkflowStep = workflowSteps.find((item) => item.stepSequence === instance.currentStep)
    if (!currentWorkflowStep || actorRole !== currentWorkflowStep.assignedRole) return NextResponse.json({ error: `Current action belongs to ${currentWorkflowStep?.assignedRole || 'no role'}` }, { status: 403 })
    const occurredAt = new Date().toISOString()
    let event

    if (action === 'override') {
      const nextValue = Number(body.proposedConsensusFcst)
      if (!Number.isFinite(nextValue) || nextValue < 0) return NextResponse.json({ error: 'proposedConsensusFcst must be a non-negative number' }, { status: 400 })
      if (!reason?.trim()) return NextResponse.json({ error: 'A reason is required for every override' }, { status: 400 })
      const oldValue = row.proposedConsensusFcst
      row.proposedConsensusFcst = Math.round(nextValue)
      event = { workflowId, workflowType: WORKFLOW_TYPES.DEMAND_CONSENSUS, stepSequence: instance.currentStep, entityType: 'DEMAND_FORECAST', entityId: row.skuId, action: 'OVERRIDE', fieldPath: 'proposedConsensusFcst', oldValue, newValue: row.proposedConsensusFcst, actorRole, reasonCode: 'PLANNER_OVERRIDE', comment: reason.trim(), occurredAt }
    } else if (action === 'approve') {
      const oldStatus = row.status
      currentWorkflowStep.status = 'COMPLETED'
      currentWorkflowStep.decision = 'APPROVED'
      currentWorkflowStep.comment = reason || 'Approved'
      currentWorkflowStep.actedAt = occurredAt
      const nextWorkflowStep = workflowSteps.find((item) => item.stepSequence === instance.currentStep + 1)
      row.status = nextWorkflowStep?.stepCode || 'LOCKED'
      row.currentStepOwner = nextWorkflowStep?.assignedRole || null
      instance.status = row.status
      instance.currentStep = nextWorkflowStep?.stepSequence || null
      instance.lockedAt = row.status === 'LOCKED' ? occurredAt : null
      if (nextWorkflowStep) nextWorkflowStep.status = 'IN_PROGRESS'
      if (row.status === 'LOCKED') row.finalConsensusFcst = row.proposedConsensusFcst
      event = { workflowId, workflowType: WORKFLOW_TYPES.DEMAND_CONSENSUS, stepSequence: currentWorkflowStep.stepSequence, entityType: 'DEMAND_FORECAST', entityId: row.skuId, action: row.status === 'LOCKED' ? 'LOCKED' : 'APPROVED', fieldPath: 'status', oldValue: oldStatus, newValue: row.status, actorRole, reasonCode: 'APPROVAL', comment: reason || 'Approved', occurredAt }
    } else if (action === 'reject') {
      if (!reason?.trim()) return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
      const oldStatus = row.status
      row.status = 'CATEGORY_REVIEW'
      row.currentStepOwner = 'Category Manager'
      workflowSteps.forEach((workflowStep) => {
        workflowStep.status = workflowStep.stepSequence === 1 ? 'IN_PROGRESS' : 'PENDING'
        workflowStep.decision = workflowStep.stepSequence === currentWorkflowStep.stepSequence ? 'REJECTED' : null
        workflowStep.comment = workflowStep.stepSequence === currentWorkflowStep.stepSequence ? reason.trim() : null
        workflowStep.actedAt = workflowStep.stepSequence === currentWorkflowStep.stepSequence ? occurredAt : null
      })
      instance.status = row.status
      instance.currentStep = 1
      instance.lockedAt = null
      event = { workflowId, workflowType: WORKFLOW_TYPES.DEMAND_CONSENSUS, stepSequence: currentWorkflowStep.stepSequence, entityType: 'DEMAND_FORECAST', entityId: row.skuId, action: 'REJECTED_REWORK', fieldPath: 'status', oldValue: oldStatus, newValue: row.status, actorRole, reasonCode: 'REWORK_REQUIRED', comment: reason.trim(), occurredAt }
    } else {
      return NextResponse.json({ error: 'action must be override, approve or reject' }, { status: 400 })
    }
    row.updatedAt = occurredAt
    instance.updatedAt = occurredAt
    const db = await getDb()
    const auditEvent = await persistWorkflowSnapshot(db, { subjectCollection: 'demand_consensus_workflows', subjectFilter: { workflowId }, subject: row, instance, steps: workflowSteps, event })
    return NextResponse.json({ ok: true, row: { ...row, workflow: instance, workflowSteps, auditTrail: demandAuditTrail([...storedEvents.filter((item) => item.workflowId === workflowId), auditEvent]) } })
  }

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
        await syncDispatchRecords(orderId, existing.distributorId, p.requestedLines)
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
        const db = await getDb()
        await db.collection('dispatch_records').deleteMany({ orderId })
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
        const storedSuggestions = await readPersistedCollection('order_suggestions')
        const storedSuggestion = storedSuggestions.find((row) => row.distributor?.id === existing.distributorId || row.distributorId === existing.distributorId)
        const built = enrichLines(existing.distributorId, lines, storedSuggestion)
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

      const storedSuggestions = await readPersistedCollection('order_suggestions')
      const storedSuggestion = storedSuggestions.find((row) => row.distributor?.id === existing.distributorId || row.distributorId === existing.distributorId)
      const built = enrichLines(existing.distributorId, lines, storedSuggestion)
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
      await syncDispatchRecords(orderId, existing.distributorId, built.lines)
      const u = await col.findOne({ orderId }, { projection: { _id: 0 } })
      return NextResponse.json({ ok: true, action: 'edited', order: { ...u, lockState } })
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ message: `PATCH /api/${path}` }, { status: 404 })
}
