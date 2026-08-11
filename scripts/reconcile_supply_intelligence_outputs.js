const fs = require('fs')
const path = require('path')

const outputDir = path.resolve(process.cwd(), 'output')
const load = (name) => JSON.parse(fs.readFileSync(path.join(outputDir, `${name}.json`), 'utf8'))
const write = (name, rows) => fs.writeFileSync(path.join(outputDir, `${name}.json`), `${JSON.stringify(rows, null, 2)}\n`)

const constraints = load('supply_constraints').filter((row) => !row.resolved)

const warnings = constraints.map((constraint, index) => ({
  warningId: `EW-${constraint.constraintType}-${index + 1}`,
  riskCategory: `${constraint.constraintType}_RISK`,
  riskDate: constraint.updatedAt || constraint.createdAt,
  horizonWeek: constraint.constraintSource?.match(/\d{4}-W\d{2}/)?.[0] || null,
  probability: null,
  probabilityScore: null,
  impact: constraint.description,
  affectedSku: constraint.skuCode,
  affectedPlant: constraint.constraintSource?.split(' / ')[0] || null,
  affectedPlantName: constraint.constraintSource?.split(' / ')[0] || null,
  recommendedAction: constraint.recommendedAction,
  actionCode: 'REVIEW_STORED_CONSTRAINT',
  severity: constraint.severity,
  status: 'ACTIVE',
  constraintSource: constraint.constraintSource,
  revenueAtRiskInr: constraint.revenueAtRiskInr,
}))

const rootCauses = constraints.map((constraint, index) => ({
  issueId: `RCA-${constraint.constraintType}-${index + 1}`,
  domain: constraint.constraintType,
  issueTitle: constraint.description,
  immediateCause: constraint.description,
  underlyingCause: `Persisted ${constraint.constraintType.toLowerCase()} constraint from ${constraint.constraintSource}`,
  affectedResources: [constraint.skuCode, constraint.constraintSource?.split(' / ')[0]].filter(Boolean),
  businessImpact: {
    revenueAtRiskInr: constraint.revenueAtRiskInr,
    backlogUnits: Number(constraint.description.match(/(\d[\d,]*) units/i)?.[1]?.replaceAll(',', '') || 0),
    description: constraint.description,
  },
  correctiveActions: [constraint.recommendedAction],
  actionCodes: ['REVIEW_STORED_CONSTRAINT'],
  causalChainNodes: [{ step: 1, node: constraint.constraintType, detail: constraint.description }],
  status: constraint.resolved ? 'RESOLVED' : 'ACTIVE',
}))

const recommendations = constraints.map((constraint, index) => ({
  recommendationId: `EXEC-${constraint.constraintType}-${index + 1}`,
  title: `Resolve ${constraint.constraintType.toLowerCase()} constraint for ${constraint.skuCode}`,
  reason: constraint.description,
  businessImpact: {
    costVarianceInr: null,
    revenueAtRiskRecoveredInr: constraint.revenueAtRiskInr,
    marginImpactPct: null,
    summary: `Protect up to ₹${Number(constraint.revenueAtRiskInr || 0).toLocaleString('en-IN')} of persisted revenue at risk.`,
  },
  expectedImprovement: {
    orderFulfillmentSla: null,
    stockoutReductionPct: null,
    daysOfSupplyRecovery: null,
  },
  priority: constraint.severity,
  confidence: null,
  confidenceScore: null,
  executiveExplanation: constraint.recommendedAction,
  actionCode: 'REVIEW_STORED_CONSTRAINT',
  status: 'RECOMMENDED',
  createdAt: constraint.updatedAt || constraint.createdAt,
}))

write('early_warnings', warnings)
write('root_cause_analyses', rootCauses)
write('executive_recommendations', recommendations)
write('dashboard_alerts', warnings.map((warning) => ({
  alertId: warning.warningId,
  severity: warning.severity.toLowerCase(),
  title: warning.impact,
  occurredAt: warning.riskDate,
})))

console.log(`reconciled ${constraints.length} live constraint(s) into warnings, RCA, recommendations and dashboard alerts`)
