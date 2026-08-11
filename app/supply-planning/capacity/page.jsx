'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Factory,
  Zap,
  Sliders,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  ClipboardCheck,
  Send,
  Lock,
  XCircle,
  Boxes
} from 'lucide-react'

const SIGNOFF_ACTOR = 's&op.lead@boat.com'

export default function CapacityPlanningPage() {
  const [plantData, setPlantData] = useState([])
  const [ratedVsActual, setRatedVsActual] = useState([])
  const [capacityGap, setCapacityGap] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [horizonLegend, setHorizonLegend] = useState(null)
  const [roughCutPlan, setRoughCutPlan] = useState(null)
  const [consensusStatus, setConsensusStatus] = useState(null)
  const [rccpParentSku, setRccpParentSku] = useState('SKU-BOAT-AD141')
  const [loading, setLoading] = useState(true)
  const [signoffBusy, setSignoffBusy] = useState(false)
  const [activeTab, setActiveTab] = useState('heatmap')

  async function fetchCapacityData() {
    setLoading(true)
    try {
      const [resCap, resRated, resGap, resRec, resLegend, resConsensus] = await Promise.all([
        fetch('/api/v1/supply-planning?action=capacity'),
        fetch('/api/v1/supply-planning?action=rated_vs_actual_capacity'),
        fetch('/api/v1/supply-planning?action=capacity_gap_analysis'),
        fetch('/api/v1/supply-planning?action=capacity_recommendations'),
        fetch('/api/v1/supply-planning?action=capacity_horizon_legend'),
        fetch('/api/v1/supply-planning?action=consensus_production_plan_status')
      ])

      const jsonCap = await resCap.json()
      const jsonRated = await resRated.json()
      const jsonGap = await resGap.json()
      const jsonRec = await resRec.json()
      const jsonLegend = await resLegend.json()
      const jsonConsensus = await resConsensus.json()

      if (jsonCap.success) setPlantData(jsonCap.data || [])
      if (jsonRated.success) setRatedVsActual(jsonRated.data || [])
      if (jsonGap.success) setCapacityGap(jsonGap.data || [])
      if (jsonRec.success) setRecommendations(jsonRec.data || [])
      if (jsonLegend.success) setHorizonLegend(jsonLegend.data || null)
      if (jsonConsensus.success) setConsensusStatus(jsonConsensus.data || null)
    } catch (e) {
      console.error('Failed to load capacity:', e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRoughCutPlan(parentSku) {
    try {
      const res = await fetch(`/api/v1/supply-planning?action=rough_cut_production_plan&parentSku=${parentSku}`)
      const json = await res.json()
      if (json.success) setRoughCutPlan(json.data)
    } catch (e) {
      console.error('Failed to load rough-cut plan:', e)
    }
  }

  useEffect(() => {
    fetchCapacityData()
  }, [])

  useEffect(() => {
    if (activeTab === 'rough_cut') {
      fetchRoughCutPlan(rccpParentSku)
    }
  }, [activeTab, rccpParentSku])

  async function handleSignoffAction(action, decision) {
    setSignoffBusy(true)
    try {
      const res = await fetch('/api/v1/supply-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, actor: SIGNOFF_ACTOR, decision })
      })
      const json = await res.json()
      if (json.success) {
        setConsensusStatus(json.data)
      } else {
        alert(json.error || 'Signoff action failed')
      }
    } catch (e) {
      console.error('Signoff action failed:', e)
    } finally {
      setSignoffBusy(false)
    }
  }

  return (
    <SupplyChainLayout activeTitle="Capacity & Resource Planning (RCCP)">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Overall Plant Utilization (%)"
          value={ratedVsActual.length ? `${(ratedVsActual.reduce((sum, row) => sum + Number(row.plannedProductionLoad || 0), 0) / Math.max(1, ratedVsActual.reduce((sum, row) => sum + Number(row.ratedWeeklyCapacity || 0), 0)) * 100).toFixed(1)}%` : '—'}
          subtitle="Target threshold: 85.0%"
          badgeText="Optimal Utilization"
          badgeType="success"
          loading={loading}
        />
        <KpiCard
          title="Active Manufacturing Plants"
          value={plantData.length.toString()}
          subtitle="Noida, Manesar, Chennai Facilities"
          badgeText="Operational"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Total Weekly Rated Capacity"
          value={`${plantData.reduce((sum, row) => sum + Number(row.weeklyCapacity || 0), 0).toLocaleString()} Units`}
          subtitle="2 Shifts / 6 Working Days"
          badgeText="6-Day Shifts"
          badgeType="info"
          loading={loading}
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'heatmap'
            ? 'bg-purple-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          Plant Rough-Cut Heatmap
        </button>
        <button
          onClick={() => setActiveTab('rated_vs_actual')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'rated_vs_actual'
            ? 'bg-purple-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          Rated vs. Actual Capacity & OEE
        </button>
        <button
          onClick={() => setActiveTab('gap_analysis')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'gap_analysis'
            ? 'bg-purple-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          52-Week Capacity Gap Heatmap
        </button>
        <button
          onClick={() => setActiveTab('rough_cut')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'rough_cut'
            ? 'bg-purple-600 text-white shadow-md'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          Rough-Cut Plan & Consensus Signoff
        </button>
      </div>

      {/* TAB 1: Plant Rough-Cut Heatmap */}
      {activeTab === 'heatmap' && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Factory className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Plant & Assembly Line Rough-Cut Capacity Heatmap</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluates factory load % against rated weekly capacity limits.
              </p>
            </div>
            <button
              onClick={() => alert("Executing Automated Capacity Rebalancing!")}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Rebalance Line Load</span>
            </button>
          </div>

          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              <div className="h-10 bg-slate-150 dark:bg-slate-800/60 rounded w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Plant Code</th>
                    <th className="px-4 py-3">Plant Name</th>
                    <th className="px-4 py-3">City / Location</th>
                    <th className="px-4 py-3">Working Shifts</th>
                    <th className="px-4 py-3">Daily Capacity</th>
                    <th className="px-4 py-3">Weekly Capacity</th>
                    <th className="px-4 py-3">Utilization Load %</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {plantData.map((plant, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">{plant.plantCode}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{plant.plantName}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{plant.city}, {plant.country}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{plant.workingShifts} Shifts / {plant.workingDays} Days</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{plant.dailyCapacity?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{plant.weeklyCapacity?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-purple-700 dark:text-purple-300">{plant.utilizationPercent}%</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={plant.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/supply-planning/plant/${plant.plantCode}`}
                          className="text-purple-600 dark:text-purple-400 hover:underline text-[11px] flex items-center space-x-1"
                        >
                          <span>Plant 360°</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Rated vs Actual Capacity & OEE */}
      {activeTab === 'rated_vs_actual' && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Rated Capacity vs Realized Actual Production Output & OEE Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contrasts designed rated plant speed against actual shift output, machine downtime loss, and OEE performance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Plant Facility</th>
                  <th className="px-4 py-3">Rated Weekly Capacity</th>
                  <th className="px-4 py-3">Planned Workload</th>
                  <th className="px-4 py-3">Actual Output Realized</th>
                  <th className="px-4 py-3">Capacity Variance</th>
                  <th className="px-4 py-3">Downtime Loss</th>
                  <th className="px-4 py-3">Downtime Reason</th>
                  <th className="px-4 py-3">OEE Rating (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {ratedVsActual.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{item.plantName} ({item.plantCode})</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.ratedWeeklyCapacity?.toLocaleString()} Units</td>
                    <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{item.plannedProductionLoad?.toLocaleString()} Units</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{item.actualRealizedOutput?.toLocaleString()} Units</td>
                    <td className={`px-4 py-3 font-semibold ${item.capacityVarianceUnits < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.capacityVarianceUnits?.toLocaleString()} Units
                    </td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{item.downtimeHours} Hrs</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.downtimeReason}</td>
                    <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{item.overallEquipmentEffectivenessPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 52-Week Capacity Gap Heatmap */}
      {activeTab === 'gap_analysis' && (
        <div className="space-y-4">
          {horizonLegend && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'shortTerm', color: 'border-cyan-400 dark:border-cyan-600' },
                { key: 'mediumTerm', color: 'border-amber-400 dark:border-amber-600' },
                { key: 'longTerm', color: 'border-purple-400 dark:border-purple-600' }
              ].map(({ key, color }) => (
                <div key={key} className={`bg-white dark:bg-slate-900/90 border-l-4 ${color} border-t border-r border-b border-slate-200 dark:border-slate-800 rounded-lg p-3`}>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{horizonLegend[key].label}</p>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400">{horizonLegend[key].range}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">{horizonLegend[key].description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Time-Phased Capacity Deficit & Surplus Gap Analysis</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Weekly breakdown of rated capacity limits vs planned workload across the full 52-week horizon, segmented by Short/Medium/Long-Term planning tier.
              </p>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Planning Week</th>
                    <th className="px-4 py-3">Horizon Tier</th>
                    <th className="px-4 py-3">Rated Capacity</th>
                    <th className="px-4 py-3">Planned Workload</th>
                    <th className="px-4 py-3">Capacity Gap (Units)</th>
                    <th className="px-4 py-3">Capacity Gap (Hours)</th>
                    <th className="px-4 py-3">Utilization %</th>
                    <th className="px-4 py-3">CapEx Event</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {capacityGap.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">{item.week}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.horizonTier === 'SHORT' ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-400 dark:border-cyan-800/60' :
                          item.horizonTier === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800/60' :
                          'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/80 dark:text-purple-400 dark:border-purple-800/60'
                        }`}>
                          {item.horizonTier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.ratedWeeklyCapacity?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-semibold">{item.plannedWorkload?.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-semibold ${item.capacityGapUnits < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.capacityGapUnits?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.capacityGapHours} Hrs</td>
                      <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{item.utilizationPct}%</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                        {item.plannedCapacityChangeUnits > 0 ? `+${item.plannedCapacityChangeUnits.toLocaleString()} New Line` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Rough-Cut Production Plan (RM + Capacity Constrained) & Consensus Signoff */}
      {activeTab === 'rough_cut' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm transition-colors duration-200">
            <div className="flex items-center space-x-3 text-xs">
              <Boxes className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Rough-Cut Parent SKU:</span>
              <select
                value={rccpParentSku}
                onChange={(e) => setRccpParentSku(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value="SKU-BOAT-AD141">boAt Airdopes 141 (TWS Earbuds)</option>
                <option value="SKU-BOAT-LD100">boAt Lunar Discovery (Smartwatch)</option>
                <option value="SKU-BOAT-ST350">boAt Stone 350 (Portable Speaker)</option>
              </select>
            </div>
            {roughCutPlan?.gatingComponent && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Live RM ceiling gated by <strong className="text-slate-800 dark:text-slate-200">{roughCutPlan.gatingComponent.componentSku}</strong> ({roughCutPlan.gatingComponent.onHandQty?.toLocaleString()} on-hand) as of {roughCutPlan.asOf ? new Date(roughCutPlan.asOf).toLocaleTimeString() : '—'}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Rough-Cut Production Plan — RM Availability + Capacity Constrained</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Constrained Production Qty = min(Gross Demand, Live RM-Buildable Qty, Rated Plant Capacity). Flags which constraint binds when demand cannot be fully met.
              </p>
            </div>

            {!roughCutPlan ? (
              <div className="p-8 space-y-3 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-6 bg-slate-150 dark:bg-slate-800/60 rounded w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Week</th>
                      <th className="px-4 py-3">Gross Demand</th>
                      <th className="px-4 py-3">RM-Buildable Qty</th>
                      <th className="px-4 py-3">Capacity Ceiling</th>
                      <th className="px-4 py-3">Constrained Production</th>
                      <th className="px-4 py-3">Shortfall</th>
                      <th className="px-4 py-3">Binding Constraint</th>
                      <th className="px-4 py-3">Feasible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {roughCutPlan.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">{row.week}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.demandQty?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.rmMaxBuildableQty != null ? row.rmMaxBuildableQty.toLocaleString() : '∞'}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.capacityConstraintUnits?.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{row.constrainedProductionQty?.toLocaleString()}</td>
                        <td className={`px-4 py-3 font-semibold ${row.shortfallUnits > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {row.shortfallUnits > 0 ? row.shortfallUnits.toLocaleString() : '0'}
                        </td>
                        <td className="px-4 py-3">
                          {row.constraintBinding === 'NONE' ? (
                            <span className="text-slate-500 dark:text-slate-400">—</span>
                          ) : (
                            <StatusBadge status={row.constraintBinding === 'RM_AVAILABILITY' ? 'SHORTAGE' : 'WARNING'} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.feasible ? 'FEASIBLE' : 'CRITICAL'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Consensus Production Planning Signoff */}
          <div className="bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                <ClipboardCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Consensus Production Planning Signoff & Alignment</h3>
              </div>
              {consensusStatus && <StatusBadge status={consensusStatus.status === 'IN_REVIEW' ? 'IN_PROGRESS' : consensusStatus.status === 'LOCKED' ? 'CLOSED' : consensusStatus.status === 'APPROVED' ? 'APPROVED' : 'ACTIVE'} />}
            </div>

            {consensusStatus && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 font-mono">
                    <p className="text-slate-500 dark:text-slate-400 font-sans">Plan ID / Cycle</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{consensusStatus.planId}</p>
                    <p className="text-slate-600 dark:text-slate-400">{consensusStatus.planningCycle}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1 font-mono">
                    <p className="text-slate-500 dark:text-slate-400 font-sans">Latest Stamp</p>
                    {consensusStatus.status === 'LOCKED' && <p>Locked by <strong>{consensusStatus.lockedBy}</strong> @ {new Date(consensusStatus.lockedAt).toLocaleString()}</p>}
                    {consensusStatus.status === 'APPROVED' && <p>Approved by <strong>{consensusStatus.approvedBy}</strong> @ {new Date(consensusStatus.approvedAt).toLocaleString()}</p>}
                    {consensusStatus.status === 'IN_REVIEW' && <p>Submitted by <strong>{consensusStatus.submittedBy}</strong> @ {new Date(consensusStatus.submittedAt).toLocaleString()}</p>}
                    {consensusStatus.status === 'DRAFT' && <p className="text-slate-500 dark:text-slate-400">No submission yet — plan editable.</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {consensusStatus.status === 'DRAFT' && (
                    <button
                      disabled={signoffBusy}
                      onClick={() => handleSignoffAction('submit_consensus_plan_for_review')}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit for Review</span>
                    </button>
                  )}
                  {consensusStatus.status === 'IN_REVIEW' && (
                    <>
                      <button
                        disabled={signoffBusy}
                        onClick={() => handleSignoffAction('review_consensus_plan', 'APPROVE')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Plan</span>
                      </button>
                      <button
                        disabled={signoffBusy}
                        onClick={() => handleSignoffAction('review_consensus_plan', 'REJECT')}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/30 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Send Back to Draft</span>
                      </button>
                    </>
                  )}
                  {consensusStatus.status === 'APPROVED' && (
                    <button
                      disabled={signoffBusy}
                      onClick={() => handleSignoffAction('lock_consensus_plan')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/40 transition-colors disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Publish & Lock Official Plan</span>
                    </button>
                  )}
                  {consensusStatus.status === 'LOCKED' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-sans flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Plan is locked — no further edits accepted for this cycle.</span>
                    </p>
                  )}
                </div>

                {consensusStatus.history.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Signoff History</p>
                    <div className="space-y-1.5 text-[11px] font-mono">
                      {consensusStatus.history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span>#{h.step} {h.fromStatus} → {h.toStatus} by {h.actor}</span>
                          <span>{new Date(h.at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Capacity Recommendations Center */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dynamic Capacity Rebalancing Action Center</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-purple-600 dark:text-purple-400">{rec.recommendationId} ({rec.plantCode})</span>
                  <StatusBadge status={rec.feasibility} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{rec.issue}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">{rec.proposedAction}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80 font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400">Gain: +{rec.unitCapacityGain?.toLocaleString()} Units</span>
                  <button
                    onClick={() => alert(`Applied Recommendation ${rec.recommendationId}: ${rec.proposedAction}`)}
                    className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-sans text-[11px] transition-colors"
                  >
                    Execute Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SupplyChainLayout>
  )
}
