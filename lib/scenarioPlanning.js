import fs from 'fs'
import path from 'path'
import { getDb } from './mongodb.js'
import { makeAuditEvent } from './workflowAudit.js'

function readLocal(collectionName) {
  try {
    const file = path.resolve(process.cwd(), 'output', `${collectionName}.json`)
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
  } catch {
    return []
  }
}

async function readCollection(collectionName) {
  try {
    const db = await getDb()
    const rows = await db.collection(collectionName).find({}).project({ _id: 0 }).toArray()
    if (rows.length) return rows
  } catch (error) {
    console.warn(`MongoDB query failed for ${collectionName}; using scenario fallback:`, error.message)
  }
  return readLocal(collectionName)
}

function summarizeScenario(version, assumptions, lines, activeScenarioVersionId) {
  const primaryAssumption = assumptions.find((row) => row.assumptionCode === 'DEMAND_UPLIFT') || assumptions[0]
  const ratePct = (code) => {
    const row = assumptions.find((item) => item.assumptionCode === code)
    return row ? Number((Number(row.value || 0) * (row.unit === 'RATE' ? 100 : 1)).toFixed(2)) : 0
  }
  return {
    ...version,
    scenarioName: version.name,
    createdBy: version.ownerUserId,
    updatedAt: version.publishedAt || version.runAt || version.createdAt,
    assumptions,
    assumptionType: primaryAssumption?.assumptionCode || null,
    assumptionValue: primaryAssumption?.unit === 'RATE' ? Number((Number(primaryAssumption.value || 0) * 100).toFixed(2)) : primaryAssumption?.value ?? null,
    demandPct: ratePct('DEMAND_UPLIFT'),
    costPct: ratePct('UNIT_COST_CHANGE'),
    capacityPct: ratePct('LINE_CAPACITY_DELTA'),
    outputLineCount: lines.length,
    revenueAtRiskRecovered: lines.reduce((sum, line) => sum + Number(line.revenuePaise || 0), 0) / 100,
    grossMarginInr: lines.reduce((sum, line) => sum + Number(line.grossMarginPaise || 0), 0) / 100,
    costVarianceInr: lines.reduce((sum, line) => sum + Number(line.costVariancePaise || 0), 0) / 100,
    unmetDemandQty: lines.reduce((sum, line) => sum + Number(line.unmetDemandQty || 0), 0),
    isActive: version.scenarioVersionId === activeScenarioVersionId,
  }
}

export function aggregateScenarioOutputs(lines = []) {
  const byWeek = new Map()
  const bySkuWeek = new Map()
  for (const line of lines) {
    const add = (map, key) => {
      const row = map.get(key) || { weekId: line.weekId, skuId: line.skuId, scenarioDemandQty: 0, scenarioSupplyQty: 0, openingInventoryQty: 0, closingInventoryQty: 0, unmetDemandQty: 0, capacityGapQty: 0 }
      row.scenarioDemandQty += Number(line.scenarioDemandQty || 0)
      row.scenarioSupplyQty += Number(line.scenarioSupplyQty || 0)
      row.openingInventoryQty += Number(line.openingInventoryQty || 0)
      row.closingInventoryQty += Number(line.closingInventoryQty || 0)
      row.unmetDemandQty += Number(line.unmetDemandQty || 0)
      row.capacityGapQty += Number(line.capacityGapQty || 0)
      map.set(key, row)
    }
    add(byWeek, line.weekId)
    add(bySkuWeek, `${line.skuId}|${line.weekId}`)
  }
  return {
    weekly: [...byWeek.values()].sort((a, b) => a.weekId.localeCompare(b.weekId)),
    skuWeekly: [...bySkuWeek.values()].sort((a, b) => a.skuId.localeCompare(b.skuId) || a.weekId.localeCompare(b.weekId)),
  }
}

export async function getScenarioCatalog({ includeActiveOutputs = false } = {}) {
  const [versions, assumptions, outputs] = await Promise.all([
    readCollection('scenario_versions'),
    readCollection('scenario_assumption_sets'),
    readCollection('scenario_output_lines'),
  ])
  const activeVersion = versions.filter((row) => row.status === 'PUBLISHED').sort((a, b) => String(a.publishedAt || '').localeCompare(String(b.publishedAt || ''))).at(-1) || null
  const activeScenarioVersionId = activeVersion?.scenarioVersionId || null
  const rows = versions.map((version) => summarizeScenario(
    version,
    assumptions.filter((row) => row.assumptionSetId === version.assumptionSetId),
    outputs.filter((row) => row.scenarioVersionId === version.scenarioVersionId),
    activeScenarioVersionId,
  ))
  const activeLines = activeScenarioVersionId ? outputs.filter((row) => row.scenarioVersionId === activeScenarioVersionId) : []
  const activeScenario = activeVersion ? {
    ...rows.find((row) => row.scenarioVersionId === activeScenarioVersionId),
    ...(aggregateScenarioOutputs(activeLines)),
    ...(includeActiveOutputs ? { outputLines: activeLines } : {}),
  } : null
  return { rows, activeScenarioVersionId, activeScenario }
}

export async function getPublishedScenarioContext(options = {}) {
  return (await getScenarioCatalog(options)).activeScenario
}

export async function publishScenarioVersion({ scenarioVersionId, actor = 'sop.lead@boat.com' } = {}) {
  if (!scenarioVersionId) throw new Error('scenarioVersionId is required')
  const [versions, outputs, planVersions] = await Promise.all([
    readCollection('scenario_versions'),
    readCollection('scenario_output_lines'),
    readCollection('consensus_plan_versions'),
  ])
  const version = versions.find((row) => row.scenarioVersionId === scenarioVersionId)
  if (!version) throw new Error(`Scenario version '${scenarioVersionId}' was not found.`)
  const lines = outputs.filter((row) => row.scenarioVersionId === scenarioVersionId)
  if (!version.runAt || !lines.length) throw new Error('Only a built scenario with persisted output lines can be published.')
  if (version.status === 'DRAFT' || version.status === 'RUNNING') throw new Error(`Scenario status '${version.status}' is not publishable.`)
  if (version.status === 'PUBLISHED') return { ...(await getScenarioCatalog({ includeActiveOutputs: false })), publishedPlanVersionId: `CPV-${scenarioVersionId}-PUBLISHED`, auditId: null, idempotent: true }

  const db = await getDb()
  const publishedAt = new Date().toISOString()
  const previousActive = versions.find((row) => row.status === 'PUBLISHED') || null
  await db.collection('scenario_versions').updateMany({ status: 'PUBLISHED', scenarioVersionId: { $ne: scenarioVersionId } }, { $set: { status: 'ARCHIVED', updatedAt: publishedAt } })
  const publishedVersion = { ...version, status: 'PUBLISHED', publishedAt, updatedAt: publishedAt, publishedByUserId: actor, source: 'USER' }
  delete publishedVersion._id
  await db.collection('scenario_versions').replaceOne({ scenarioVersionId }, publishedVersion, { upsert: true })

  const aggregated = aggregateScenarioOutputs(lines)
  const baselinePlan = planVersions.find((row) => row.planVersionId === version.baselinePlanVersionId) || {}
  const planVersionId = `CPV-${scenarioVersionId}-PUBLISHED`
  const consensusVersion = {
    planVersionId,
    calendarVersionId: version.calendarVersionId,
    sourceScenarioVersionId: scenarioVersionId,
    demandForecastVersionId: baselinePlan.demandForecastVersionId || null,
    workflowId: version.workflowId || null,
    name: `${version.name} — Published Scenario Plan`,
    status: 'APPROVED',
    ownerUserId: actor,
    approvedAt: version.approvedAt || publishedAt,
    lockedThroughWeek: baselinePlan.lockedThroughWeek || null,
    publishedAt,
    source: 'USER',
    dataVersion: version.dataVersion,
    generationSeed: version.generationSeed,
  }
  await db.collection('consensus_plan_versions').replaceOne({ planVersionId }, consensusVersion, { upsert: true })
  const consensusLines = aggregated.skuWeekly.map((line) => ({
    planVersionId,
    skuId: line.skuId,
    weekId: line.weekId,
    channelDemandQty: line.scenarioDemandQty,
    consensusDemandQty: line.scenarioDemandQty,
    plannedProductionQty: line.scenarioSupplyQty,
    plannedPurchaseQty: 0,
    plannedTransferInQty: 0,
    plannedTransferOutQty: 0,
    openingInventoryQty: line.openingInventoryQty,
    closingInventoryQty: line.closingInventoryQty,
    unmetDemandQty: line.unmetDemandQty,
    capacityGapQty: line.capacityGapQty,
    isLocked: false,
    sourceForecastVersionId: baselinePlan.demandForecastVersionId || null,
    sourceScenarioVersionId: scenarioVersionId,
    source: 'USER',
    dataVersion: version.dataVersion,
    generationSeed: version.generationSeed,
  }))
  await db.collection('consensus_plan_lines').deleteMany({ planVersionId })
  if (consensusLines.length) await db.collection('consensus_plan_lines').insertMany(consensusLines)

  const workflowId = `SCENARIO-PUBLISH-${scenarioVersionId}`
  const latestAudit = await db.collection('entity_audit_events').find({ workflowId }).sort({ sequence: -1 }).limit(1).next()
  const auditEvent = makeAuditEvent({
    workflowId,
    workflowType: 'SCENARIO_PUBLICATION',
    stepSequence: 1,
    entityType: 'SCENARIO_VERSION',
    entityId: scenarioVersionId,
    action: 'PUBLISHED',
    fieldPath: 'status',
    oldValue: version.status,
    newValue: 'PUBLISHED',
    actor,
    actorRole: 'S&OP Lead',
    reasonCode: 'SELECTED_ACTIVE_SCENARIO',
    comment: `Published ${version.name} to consensus plan ${planVersionId}.`,
    occurredAt: publishedAt,
    sequence: Number(latestAudit?.sequence || 0) + 1,
  })
  await db.collection('entity_audit_events').insertOne(auditEvent)

  const catalog = await getScenarioCatalog({ includeActiveOutputs: false })
  return { ...catalog, publishedPlanVersionId: planVersionId, publishedLineCount: consensusLines.length, previousActiveScenarioVersionId: previousActive?.scenarioVersionId || null, auditId: auditEvent.auditId, idempotent: false }
}
