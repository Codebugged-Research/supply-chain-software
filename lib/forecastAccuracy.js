export function summarizeStoredForecastAccuracy(rows = []) {
  const validMapeRows = rows.filter((row) => Number.isFinite(Number(row.absolutePctError)))
  const validBiasRows = rows.filter((row) => Number.isFinite(Number(row.biasPct)))
  const mapePct = validMapeRows.length
    ? validMapeRows.reduce((sum, row) => sum + Number(row.absolutePctError), 0) / validMapeRows.length * 100
    : null
  const biasPct = validBiasRows.length
    ? validBiasRows.reduce((sum, row) => sum + Number(row.biasPct), 0) / validBiasRows.length * 100
    : null
  const storedAccuracyPct = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.accuracyPct || 0), 0) / rows.length * 100
    : null
  return {
    rowCount: rows.length,
    mapePct,
    biasPct,
    accuracyPct: storedAccuracyPct,
    source: 'forecast_accuracy_history',
  }
}
