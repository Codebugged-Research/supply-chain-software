export function summarizeNpiReadiness(items = []) {
  const requiredWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0)
  const completedItems = items.filter((item) => item.status === 'COMPLETED' && item.evidenceRef)
  const completedWeight = completedItems.reduce((sum, item) => sum + Number(item.weight || 0), 0)
  return {
    requiredWeight,
    completedWeight,
    readinessPct: requiredWeight ? Number((completedWeight / requiredWeight * 100).toFixed(1)) : 0,
    completedItemCount: completedItems.length,
    totalItemCount: items.length,
    sourceCollection: 'npi_readiness_items',
  }
}

export function canonicalNpiRecord(product, readinessItems = []) {
  const items = readinessItems.filter((item) => item.npiId === product.npiId)
  return { ...product, readinessItems: items, ...summarizeNpiReadiness(items) }
}

export function canonicalNpiReservations(product, readiness, vintages = []) {
  const stored = vintages
    .filter((row) => row.skuId === product.skuId && row.targetWeek >= product.launchWeek)
    .sort((a, b) => a.targetWeek.localeCompare(b.targetWeek) || a.horizonWeeks - b.horizonWeeks)
    .filter((row, index, rows) => index === rows.findIndex((candidate) => candidate.targetWeek === row.targetWeek))
    .slice(0, product.rampWeeks || 12)
    .map((row) => ({ forecastId: row.forecastId, week: row.targetWeek, reservationQty: Number(row.forecastQty || 0), sourceCollection: 'forecast_vintages' }))
  if (stored.length) return stored
  const readinessFactor = 0.65 + 0.35 * Number(readiness.readinessPct || 0) / 100
  return [{
    forecastId: null,
    week: product.launchWeek,
    reservationQty: Math.round(Number(product.targetPeakWeeklyUnits || 0) * readinessFactor),
    sourceCollection: 'npi_products+npi_readiness_items',
  }]
}
