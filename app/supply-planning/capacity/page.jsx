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
  Sparkles
} from 'lucide-react'

export default function CapacityPlanningPage() {
  const [plantData, setPlantData] = useState([])
  const [ratedVsActual, setRatedVsActual] = useState([])
  const [capacityGap, setCapacityGap] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('heatmap')

  useEffect(() => {
    async function fetchCapacityData() {
      setLoading(true)
      try {
        const [resCap, resRated, resGap, resRec] = await Promise.all([
          fetch('/api/v1/supply-planning?action=capacity'),
          fetch('/api/v1/supply-planning?action=rated_vs_actual_capacity'),
          fetch('/api/v1/supply-planning?action=capacity_gap_analysis'),
          fetch('/api/v1/supply-planning?action=capacity_recommendations')
        ])

        const jsonCap = await resCap.json()
        const jsonRated = await resRated.json()
        const jsonGap = await resGap.json()
        const jsonRec = await resRec.json()

        if (jsonCap.success) setPlantData(jsonCap.data || [])
        if (jsonRated.success) setRatedVsActual(jsonRated.data || [])
        if (jsonGap.success) setCapacityGap(jsonGap.data || [])
        if (jsonRec.success) setRecommendations(jsonRec.data || [])
      } catch (e) {
        console.error('Failed to load capacity:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchCapacityData()
  }, [])

  return (
    <SupplyChainLayout activeTitle="Capacity & Resource Planning (RCCP)">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Overall Plant Utilization (%)"
          value="82.4%"
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
          value="450,000 Units"
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
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span>Time-Phased Capacity Deficit & Surplus Gap Analysis</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Weekly breakdown of rated capacity limits vs planned workload across 52-week horizon.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Planning Week</th>
                  <th className="px-4 py-3">Rated Capacity</th>
                  <th className="px-4 py-3">Planned Workload</th>
                  <th className="px-4 py-3">Capacity Gap (Units)</th>
                  <th className="px-4 py-3">Capacity Gap (Hours)</th>
                  <th className="px-4 py-3">Utilization %</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {capacityGap.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">{item.week}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.ratedWeeklyCapacity?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-semibold">{item.plannedWorkload?.toLocaleString()}</td>
                    <td className={`px-4 py-3 font-semibold ${item.capacityGapUnits < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.capacityGapUnits?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.capacityGapHours} Hrs</td>
                    <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{item.utilizationPct}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
