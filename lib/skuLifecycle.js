export const LIFECYCLE_STAGES = ['NEW', 'GROWTH', 'MATURE', 'DECLINE', 'EOL']

export const FORECAST_METHOD_BY_LIFECYCLE = {
  NEW: 'NPI_RAMP',
  GROWTH: 'TREND_EVENT',
  MATURE: 'SEASONAL_BASELINE',
  DECLINE: 'RAMP_DOWN',
  EOL: 'EOL_CLEARANCE',
}

export const INVENTORY_MULTIPLIER_BY_LIFECYCLE = {
  NEW: 1.5,
  GROWTH: 1.2,
  MATURE: 1,
  DECLINE: 0.85,
  EOL: 0.5,
}

export function normalizeLifecycleStage(stage) {
  const normalized = String(stage || '').toUpperCase()
  if (normalized === 'NPI' || normalized === 'LAUNCH') return 'NEW'
  if (normalized === 'MATURITY') return 'MATURE'
  return LIFECYCLE_STAGES.includes(normalized) ? normalized : null
}

export function lifecycleStageForUi(stage) {
  const normalized = normalizeLifecycleStage(stage)
  return normalized === 'NEW' ? 'NPI' : normalized === 'MATURE' ? 'MATURITY' : normalized
}

export function forecastMethodForLifecycle(stage) {
  return FORECAST_METHOD_BY_LIFECYCLE[normalizeLifecycleStage(stage)] || FORECAST_METHOD_BY_LIFECYCLE.MATURE
}

export function inventoryMultiplierForLifecycle(stage) {
  return INVENTORY_MULTIPLIER_BY_LIFECYCLE[normalizeLifecycleStage(stage)] || 1
}

function skuKey(sku) {
  return sku?.id || sku?.skuId || sku?.skuCode
}

export function resolveEffectiveLifecycle(sku, transitionHistory = [], asOfWeek = null) {
  const id = skuKey(sku)
  const applicable = transitionHistory
    .filter((row) => row.skuId === id)
    .filter((row) => !asOfWeek || row.effectiveWeek <= asOfWeek)
    .filter((row) => !asOfWeek || !row.effectiveToWeek || row.effectiveToWeek > asOfWeek)
    .sort((a, b) => a.effectiveWeek.localeCompare(b.effectiveWeek) || String(a.occurredAt || '').localeCompare(String(b.occurredAt || '')))
  const transition = applicable.at(-1) || null
  const stage = normalizeLifecycleStage(transition?.newStage || sku?.lifecycleStage) || 'MATURE'
  return {
    ...sku,
    lifecycleStage: stage,
    lifecycleStageSinceWeek: transition?.effectiveWeek || sku?.lifecycleStageSinceWeek || sku?.effectiveFromWeek || null,
    forecastMethod: forecastMethodForLifecycle(stage),
    lifecycleTransitionId: transition?.transitionId || null,
    lifecycleSourceCollection: 'sop_skus',
    lifecycleHistoryCollection: 'lifecycle_transition_history',
  }
}

export function lifecycleRowFromCanonicalSku(sku, transitionHistory = [], asOfWeek = null) {
  const effective = resolveEffectiveLifecycle(sku, transitionHistory, asOfWeek)
  const stage = lifecycleStageForUi(effective.lifecycleStage)
  return {
    ...effective,
    skuId: skuKey(effective),
    skuName: effective.name || effective.skuName,
    stage,
    stageSince: effective.lifecycleStageSinceWeek,
    forecastMethods: {
      short: effective.forecastMethod,
      mid: effective.forecastMethod,
      long: effective.forecastMethod,
    },
  }
}

export function applyLifecycleToInventoryQuantity(baseQuantity, stage) {
  return Math.max(0, Math.ceil(Number(baseQuantity || 0) * inventoryMultiplierForLifecycle(stage)))
}

export function buildCanonicalLifecycleTransition({ sku, stage, effectiveWeek, occurredAt, actorUserId, actorRole, transitionId }) {
  const newStage = normalizeLifecycleStage(stage)
  if (!newStage) throw new Error('Invalid lifecycle stage')
  const oldStage = normalizeLifecycleStage(sku?.lifecycleStage) || 'MATURE'
  const id = skuKey(sku)
  const timestamp = occurredAt || new Date().toISOString()
  const nextSku = {
    ...sku,
    lifecycleStage: newStage,
    lifecycleStageSinceWeek: effectiveWeek,
    effectiveFromWeek: effectiveWeek,
    forecastMethod: forecastMethodForLifecycle(newStage),
    version: Number(sku?.version || 0) + 1,
    status: newStage === 'EOL' ? 'DISCONTINUING' : sku?.status === 'DISCONTINUING' ? 'ACTIVE' : sku?.status,
    updatedAt: timestamp,
    source: 'USER',
  }
  const transition = {
    transitionId,
    skuId: id,
    oldStage,
    newStage,
    effectiveWeek,
    effectiveToWeek: null,
    actorUserId,
    actorRole,
    reasonCode: 'PLANNER_STAGE_CHANGE',
    comment: 'Lifecycle stage changed from the Demand Planning workbench.',
    occurredAt: timestamp,
    source: 'USER',
    dataVersion: sku?.dataVersion,
    generationSeed: sku?.generationSeed,
  }
  return { nextSku, transition }
}
