'use client'

import React, { useState, useEffect } from 'react'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Plus
} from 'lucide-react'

export default function ScenarioStudioPage() {
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScenarios() {
      setLoading(true)
      try {
        const res = await fetch('/api/v1/supply-planning?action=scenarios')
        const json = await res.json()
        if (json.success) {
          setScenarios(json.data || [])
        }
      } catch (e) {
        console.error('Failed to load scenarios:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchScenarios()
  }, [])

  return (
    <SupplyChainLayout activeTitle="S&OP Scenario Simulation Studio">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Simulated Scenarios"
          value={scenarios.length.toString()}
          subtitle="Q3 Festive Surge & Disruption Models"
          badgeText="Simulation Active"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Simulated Cost Variance vs Baseline"
          value="+₹1.25M INR"
          subtitle="Working Capital & Overtime Freight"
          badgeText="Within Budget"
          badgeType="warning"
          loading={loading}
        />
        <KpiCard
          title="Simulated Service Level Delta"
          value="+1.2%"
          subtitle="Boosts service level from 97.3% to 98.5%"
          badgeText="SLA Compliant"
          badgeType="success"
          loading={loading}
        />
      </div>

      {/* Scenario Builder & Executive Publishing Hub */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-6 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Side-by-Side S&OP Executive Trade-Off Comparison Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Compare Baseline vs Simulated What-If Scenarios before promoting the official Executive S&OP plan.
            </p>
          </div>

          <button
            onClick={() => alert("Simulation engine running! New scenario created.")}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Build New Scenario</span>
          </button>
        </div>

        {/* Side-by-Side Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Strategic Metric</th>
                <th className="px-4 py-3 min-w-[180px] bg-slate-100/80 dark:bg-slate-900/80">Active Baseline Plan</th>
                <th className="px-4 py-3 min-w-[200px] bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                  Scenario A: Festive Surge (+20%)
                </th>
                <th className="px-4 py-3 min-w-[200px]">
                  Scenario B: Supplier Disruption (14d)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Gross Forecast Demand</td>
                <td className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">124,800 Units</td>
                <td className="px-4 py-3 bg-purple-50/30 dark:bg-purple-950/20 font-bold text-purple-600 dark:text-purple-400">149,760 Units (+20%)</td>
                <td className="px-4 py-3">124,800 Units</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Planned Production Runs</td>
                <td className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">85,000 Units</td>
                <td className="px-4 py-3 bg-purple-50/30 dark:bg-purple-950/20 text-emerald-600 dark:text-emerald-400 font-semibold">105,000 Units</td>
                <td className="px-4 py-3">85,000 Units</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Planned Vendor Purchases</td>
                <td className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">48,000 Units</td>
                <td className="px-4 py-3 bg-purple-50/30 dark:bg-purple-950/20 text-cyan-600 dark:text-cyan-400 font-semibold">58,000 Units</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">32,000 Units (-33%)</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Projected Service Level (%)</td>
                <td className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">97.3%</td>
                <td className="px-4 py-3 bg-purple-50/30 dark:bg-purple-950/20 font-bold text-emerald-600 dark:text-emerald-400">98.5% (+1.2%)</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">91.4% (-5.9%)</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Total Supply Plan Cost</td>
                <td className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">₹42.5M INR</td>
                <td className="px-4 py-3 bg-purple-50/30 dark:bg-purple-950/20 font-bold text-slate-900 dark:text-slate-100">₹43.75M INR (+₹1.25M)</td>
                <td className="px-4 py-3">₹38.2M INR</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Unfulfilled Revenue at Risk</td>
                <td className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40">₹1.5M INR</td>
                <td className="px-4 py-3 bg-purple-50/30 dark:bg-purple-950/20 text-emerald-600 dark:text-emerald-400 font-bold">₹0.00 INR (Fully Recovered)</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-bold">₹4.8M INR</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-950/60">
                <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">Executive Consensus Action</td>
                <td className="px-4 py-4 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400">Active Baseline</td>
                <td className="px-4 py-4 bg-purple-50/50 dark:bg-purple-950/40">
                  <button
                    onClick={() => alert("Published Official Executive S&OP Supply Plan!")}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-purple-600/40 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Official S&OP Plan</span>
                  </button>
                </td>
                <td className="px-4 py-4 text-slate-500 dark:text-slate-500">Not Recommended</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SupplyChainLayout>
  )
}

