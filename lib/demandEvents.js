const asArray = (value) => value == null ? [] : Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean)

export function eventUpliftPct(event) {
  const canonical = Number(event?.upliftPct)
  if (Number.isFinite(canonical)) return canonical
  const percent = Number(event?.upliftPercent)
  return Number.isFinite(percent) ? percent / 100 : 0
}

function isoWeekStart(weekId) {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(String(weekId || ''))
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const day = januaryFourth.getUTCDay() || 7
  return new Date(januaryFourth.getTime() - (day - 1) * 86400000 + (week - 1) * 7 * 86400000)
}

function weekOffset(fromWeek, toWeek) {
  const from = isoWeekStart(fromWeek)
  const to = isoWeekStart(toWeek)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / (7 * 86400000))
}

export function shapedEventUpliftPct(event, weekId) {
  const position = weekOffset(event?.startWeek, weekId)
  const span = weekOffset(event?.startWeek, event?.endWeek)
  if (position == null || span == null || position < 0 || position > span) return 0

  const base = eventUpliftPct(event)
  const duration = Math.max(1, span + 1)
  const shape = String(event?.upliftShape || 'FLAT').toUpperCase()
  if (shape === 'TRIANGULAR' && duration > 1) {
    return base * (1 - Math.abs((2 * position) / (duration - 1) - 1) * 0.35)
  }
  if (shape === 'LAUNCH_TAIL') return base * Math.exp(-0.35 * position)
  return base
}

function intersects(scope, candidates) {
  return !scope.length || candidates.some((candidate) => scope.includes(candidate))
}

export function demandEventApplies(event, context = {}) {
  if (!event || event.status === 'CANCELLED') return false
  if (String(context.weekId || '') < String(event.startWeek || '') || String(context.weekId || '') > String(event.endWeek || '')) return false

  const skuScope = asArray(event.skuIds).length ? asArray(event.skuIds) : asArray(event.affectedSkus)
  const channelScope = asArray(event.channelIds).length ? asArray(event.channelIds) : asArray(event.affectedChannels)
  const categoryScope = asArray(event.categories)
  const regionScope = asArray(event.regionIds)
  const skuIds = asArray(context.skuIds).concat(asArray(context.skuId))
  const channelIds = asArray(context.channelIds).concat(asArray(context.channelId))
  const categories = asArray(context.categories).concat(asArray(context.category), asArray(context.subCategory))
  const regionIds = asArray(context.regionIds).concat(asArray(context.regionId), asArray(context.region))

  return intersects(skuScope, skuIds)
    && intersects(channelScope, channelIds)
    && intersects(categoryScope, categories)
    && intersects(regionScope, regionIds)
}

export function calculateDemandEventImpact(events, context = {}) {
  const appliedEvents = asArray(events).filter((event) => demandEventApplies(event, context))
  const groups = new Map()

  appliedEvents.forEach((event) => {
    const groupId = event.stackingGroup || event.eventId || 'UNGROUPED'
    const current = groups.get(groupId) || { compound: 1, cap: Number.POSITIVE_INFINITY }
    current.compound *= 1 + shapedEventUpliftPct(event, context.weekId)
    const cap = Number(event.maxStackedUpliftPct)
    if (Number.isFinite(cap)) current.cap = Math.min(current.cap, cap)
    groups.set(groupId, current)
  })

  let multiplier = 1
  groups.forEach((group) => {
    multiplier *= 1 + Math.min(group.cap, group.compound - 1)
  })
  const upliftPct = multiplier - 1
  return {
    appliedEvents,
    appliedEventIds: appliedEvents.map((event) => event.eventId),
    upliftPct,
    multiplier,
  }
}

export function applyDemandEvents(baseQty, events, context = {}) {
  const impact = calculateDemandEventImpact(events, context)
  const baselineQty = Number(baseQty || 0)
  const adjustedQty = Math.max(0, Math.round(baselineQty * impact.multiplier))
  return { ...impact, baseQty: baselineQty, adjustedQty, upliftQty: adjustedQty - baselineQty }
}

function lifecycleKey(stage) {
  const normalized = String(stage || 'MATURE').toUpperCase()
  if (['NEW', 'NPI', 'LAUNCH'].includes(normalized)) return 'New'
  if (normalized === 'GROWTH') return 'Growth'
  if (normalized === 'DECLINE' || normalized === 'EOL') return 'Decline'
  return 'Mature'
}

export function applyDemandFactorsAndEvents(baseQty, events, context = {}, config = {}, enabled = {}) {
  const baselineQty = Number(baseQty || 0)
  const lifecycle = lifecycleKey(context.lifecycleStage)
  const plcMultiplier = enabled.plc === false ? 1 : Number(config.plcMultipliers?.[lifecycle] ?? 1)
  const weekStart = context.weekStart ? new Date(`${context.weekStart}T00:00:00Z`) : isoWeekStart(context.weekId)
  const monthIndex = weekStart && !Number.isNaN(weekStart.getTime()) ? weekStart.getUTCMonth() : 0
  const seasonalMultiplier = enabled.seasonality === false ? 1 : Number(config.seasonalityPatterns?.[context.category]?.[monthIndex] ?? 1)
  const regionMultiplier = enabled.location ? Number(config.regionMultipliers?.[context.region]?.[context.category] ?? 1) : 1
  const preEventQty = Math.max(0, Math.round(baselineQty * plcMultiplier * seasonalMultiplier * regionMultiplier))
  const eventImpact = enabled.promotions === false
    ? { appliedEvents: [], appliedEventIds: [], upliftPct: 0, multiplier: 1, adjustedQty: preEventQty, upliftQty: 0 }
    : applyDemandEvents(preEventQty, events, context)
  return {
    ...eventImpact,
    baseQty: baselineQty,
    adjustedQty: eventImpact.adjustedQty,
    netAdjustmentQty: eventImpact.adjustedQty - baselineQty,
    preEventQty,
    plcMultiplier,
    seasonalMultiplier,
    regionMultiplier,
  }
}

export function demandEventScopeLabel(event) {
  const skuCount = (event?.skuIds || event?.affectedSkus || []).length
  const channelCount = (event?.channelIds || event?.affectedChannels || []).length
  const categoryCount = (event?.categories || []).length
  const regionCount = (event?.regionIds || []).length
  return [
    skuCount ? `${skuCount} SKU${skuCount === 1 ? '' : 's'}` : 'all SKUs',
    channelCount ? `${channelCount} channel${channelCount === 1 ? '' : 's'}` : 'all channels',
    categoryCount ? `${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}` : null,
    regionCount ? `${regionCount} region${regionCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(', ')
}
