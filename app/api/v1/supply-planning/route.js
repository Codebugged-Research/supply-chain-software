import { NextResponse } from 'next/server'
import {
  getOverviewMetrics,
  getSupplyPlanGrid,
  recalculateMrp,
  getBomExplosion,
  getCapacityRccp,
  getPurchaseOrdersWorkbench,
  getDistributionNetwork,
  getConstraintsList,
  resolveSupplyRisk,
  getScenariosList,
  publishSupplyScenario,
  getSkuDetail360,
  getSupplierDetail360,
  getPlantDetail360,
  getDataSourcesSummary,
  getRatedVsActualCapacity,
  getCapacityGapAnalysis,
  generateCapacityRecommendations,
  executeCapacityRecommendation,
  getSupplierVsProductionNeedDates,
  getProcurementAlignment,
  executeProcurementAlignmentAction,
  getEarlyWarningAlerts,
  generateEarlyWarningEngine,
  executeEarlyWarningMitigation,
  getRootCauseTree,
  generateRootCauseAnalysisEngine,
  executeRcaCorrectiveAction,
  getExecutiveRecommendations,
  generateExecutiveRecommendationEngine,
  executeExecutiveRecommendation,
  getPoHandoverAdherence,
  getPoAdherenceSummary,
  setPoExclusionFlag,
  getOdmEmsMaster,
  getSupplierReliabilityScorecard,
  getCapacityHorizonLegend,
  getRoughCutProductionPlan,
  getConsensusProductionPlanStatus,
  submitConsensusProductionPlanForReview,
  reviewConsensusProductionPlan,
  lockConsensusProductionPlan,
  getImportControlTower,
  getNpiSupplyPipeline
} from '@/lib/supplyChainService'
import { getCanonicalChannelInventoryNorms } from '@/lib/channelInventoryNorms'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'overview'

  try {
    if (action === 'overview') {
      const data = await getOverviewMetrics(searchParams.get('portfolio') || 'all')
      return NextResponse.json({ success: true, data })
    }

    if (action === 'grid') {
      const skuCode = searchParams.get('skuCode')
      const location = searchParams.get('location')
      const startWeek = searchParams.get('startWeek')
      const data = await getSupplyPlanGrid({ skuCode, location, startWeek })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'npi_readiness' || action === 'npi_pipeline') {
      const data = await getNpiSupplyPipeline()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'bom') {
      const parentSku = searchParams.get('parentSku') || 'SKU-BOAT-AD141'
      const data = await getBomExplosion(parentSku)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'capacity') {
      const plantCode = searchParams.get('plantCode')
      const data = await getCapacityRccp(plantCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'procurement') {
      const supplierCode = searchParams.get('supplierCode')
      const data = await getPurchaseOrdersWorkbench(supplierCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'distribution') {
      const data = await getDistributionNetwork()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'channel_inventory_norms') {
      const data = await getCanonicalChannelInventoryNorms()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'import_control_tower') {
      const data = await getImportControlTower()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'constraints') {
      const data = await getConstraintsList()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'scenarios') {
      const data = await getScenariosList()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'sku_detail') {
      const skuCode = searchParams.get('skuCode') || 'SKU-BOAT-AD141'
      const data = await getSkuDetail360(skuCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'supplier_detail') {
      const supplierCode = searchParams.get('supplierCode')
      if (!supplierCode) return NextResponse.json({ success: false, error: 'supplierCode is required' }, { status: 400 })
      const data = await getSupplierDetail360(supplierCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'plant_detail') {
      const plantCode = searchParams.get('plantCode') || 'PLANT-NOIDA'
      const data = await getPlantDetail360(plantCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'data_sources') {
      const data = await getDataSourcesSummary()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'rated_vs_actual_capacity') {
      const plantCode = searchParams.get('plantCode')
      const data = await getRatedVsActualCapacity(plantCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'capacity_gap_analysis') {
      const plantCode = searchParams.get('plantCode')
      const data = await getCapacityGapAnalysis(plantCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'capacity_recommendations' || action === 'capacity_recommendation_engine') {
      const plantCode = searchParams.get('plantCode')
      const data = await generateCapacityRecommendations(plantCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'procurement_alignment' || action === 'supplier_production_need_dates') {
      const supplierCode = searchParams.get('supplierCode')
      const skuCode = searchParams.get('skuCode')
      const deliveryFlag = searchParams.get('deliveryFlag') || searchParams.get('flag')
      const risk = searchParams.get('risk')
      const data = await getProcurementAlignment({ supplierCode, skuCode, deliveryFlag, risk })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'early_warning_system' || action === 'early_warning_engine') {
      const category = searchParams.get('category') || searchParams.get('riskCategory')
      const plantCode = searchParams.get('plantCode') || searchParams.get('affectedPlant')
      const skuCode = searchParams.get('skuCode') || searchParams.get('affectedSku')
      const severity = searchParams.get('severity')
      const data = await generateEarlyWarningEngine({ category, plantCode, skuCode, severity })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'root_cause_analysis' || action === 'root_cause_engine') {
      const domain = searchParams.get('domain')
      const issueId = searchParams.get('issueId') || searchParams.get('constraintId')
      const skuCode = searchParams.get('skuCode')
      const plantCode = searchParams.get('plantCode')
      const data = await generateRootCauseAnalysisEngine({ domain, issueId, skuCode, plantCode })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'executive_recommendation_engine' || action === 'executive_recommendations') {
      const priority = searchParams.get('priority')
      const recommendationId = searchParams.get('recommendationId') || searchParams.get('optionId')
      const data = await generateExecutiveRecommendationEngine({ priority, recommendationId })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'po_hod_adherence') {
      const supplierCode = searchParams.get('supplierCode')
      const skuCode = searchParams.get('skuCode')
      const data = await getPoHandoverAdherence({ supplierCode, skuCode })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'po_adherence_summary') {
      const supplierCode = searchParams.get('supplierCode')
      const skuCode = searchParams.get('skuCode')
      const data = await getPoAdherenceSummary({ supplierCode, skuCode })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'odm_ems_master') {
      const supplierCode = searchParams.get('supplierCode')
      const data = await getOdmEmsMaster({ supplierCode })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'supplier_reliability_scorecard') {
      const supplierCode = searchParams.get('supplierCode')
      const data = await getSupplierReliabilityScorecard({ supplierCode })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'capacity_horizon_legend') {
      const data = await getCapacityHorizonLegend()
      return NextResponse.json({ success: true, data })
    }

    if (action === 'rough_cut_production_plan') {
      const parentSku = searchParams.get('parentSku') || searchParams.get('skuCode')
      const plantCode = searchParams.get('plantCode')
      const data = await getRoughCutProductionPlan({ parentSku, plantCode })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'consensus_production_plan_status') {
      const data = await getConsensusProductionPlanStatus()
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: false, error: 'Unknown action parameter' }, { status: 400 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, recommendationId, plantCode, poNumber, actionCode, warningId, issueId, constraintId, exclusionCode, reason, actor, decision, notes, skuCode, location, startWeek } = body

    if (action === 'recalculate_mrp') {
      const data = await recalculateMrp({ skuCode, location, startWeek })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'resolve_supply_risk') {
      if (!constraintId || !String(reason || '').trim()) {
        return NextResponse.json({ success: false, error: 'constraintId and a resolution reason are required' }, { status: 400 })
      }
      const data = await resolveSupplyRisk({ constraintId, reason, actor })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'publish_scenario') {
      if (!body.scenarioVersionId) return NextResponse.json({ success: false, error: 'scenarioVersionId is required' }, { status: 400 })
      const data = await publishSupplyScenario({ scenarioVersionId: body.scenarioVersionId, actor })
      return NextResponse.json({ success: true, data })
    }

    if (action === 'execute_capacity_recommendation') {
      const result = await executeCapacityRecommendation(recommendationId || 'REC-PLANT-NOIDA-2026-W34')
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'capacity_recommendation_engine') {
      const data = await generateCapacityRecommendations(plantCode)
      return NextResponse.json({ success: true, data })
    }

    if (action === 'execute_procurement_action') {
      const result = await executeProcurementAlignmentAction(poNumber, actionCode)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'set_po_exclusion') {
      const result = await setPoExclusionFlag(poNumber, exclusionCode, reason, actor)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'submit_consensus_plan_for_review') {
      const result = await submitConsensusProductionPlanForReview(actor, notes)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'review_consensus_plan') {
      const result = await reviewConsensusProductionPlan(actor, decision, notes)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'lock_consensus_plan') {
      const result = await lockConsensusProductionPlan(actor)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'execute_early_warning_mitigation' || action === 'acknowledge_early_warning') {
      const result = await executeEarlyWarningMitigation(warningId, actionCode)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'execute_rca_corrective_action' || action === 'resolve_root_cause_issue') {
      const result = await executeRcaCorrectiveAction(issueId, actionCode)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'execute_executive_recommendation' || action === 'approve_executive_recommendation') {
      const result = await executeExecutiveRecommendation(recommendationId || 'EXEC-REC-01', actionCode)
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ success: false, error: 'Unknown action parameter' }, { status: 400 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
