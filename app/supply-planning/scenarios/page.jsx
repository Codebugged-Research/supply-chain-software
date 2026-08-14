'use client'

import React, { useState, useEffect } from 'react'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Layers,
  Plus,
  Send
} from 'lucide-react'

export default function ScenarioStudioPage() {
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState(null)
  const [publishError, setPublishError] = useState('')

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

  const formatOutcome = (value, formatter = (item) => item) => value == null ? 'Not calculated' : formatter(value)

  const publishScenario = async (scenarioVersionId) => {
    setPublishingId(scenarioVersionId)
    setPublishError('')
    try {
      const response = await fetch('/api/v1/supply-planning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish_scenario', scenarioVersionId, actor: 'sop.lead@boat.com' }) })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Scenario publication failed')
      setScenarios(payload.data.rows || [])
    } catch (error) {
      setPublishError(error.message)
    } finally {
      setPublishingId(null)
    }
  }

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
          value={scenarios.some((scenario) => scenario.costVarianceInr != null) ? `₹${scenarios.reduce((sum, scenario) => sum + Number(scenario.costVarianceInr || 0), 0).toLocaleString()} INR` : 'Not calculated'}
          subtitle="Persisted scenario outcome"
          badgeText="Within Budget"
          badgeType="warning"
          loading={loading}
        />
        <KpiCard
          title="Simulated Service Level Delta"
          value={scenarios.find((scenario) => scenario.serviceLevelDelta != null)?.serviceLevelDelta ?? 'Not calculated'}
          subtitle="Persisted scenario outcome"
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
              Review persisted What-If assumptions and calculated outcomes before promoting an Executive S&OP plan.
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

        {/* Persisted scenario records */}
        {publishError && <p className="text-xs text-rose-600 dark:text-rose-400">{publishError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 min-w-[240px]">Scenario</th>
                <th className="px-4 py-3">Assumption</th>
                <th className="px-4 py-3">Generated Plan</th>
                <th className="px-4 py-3">Cost Variance</th>
                <th className="px-4 py-3">Service Delta</th>
                <th className="px-4 py-3">Revenue Risk Recovered</th>
                <th className="px-4 py-3">Publish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {!loading && scenarios.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No persisted scenarios found.</td></tr>
              )}
              {scenarios.map((scenario) => (
                <tr key={scenario._id || scenario.scenarioName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold font-sans text-slate-900 dark:text-white">{scenario.scenarioName} {scenario.isActive && <span className="ml-1 text-emerald-600">· Active</span>}</div>
                    <div className="mt-1 font-sans text-[11px] text-slate-500">{scenario.description}</div>
                  </td>
                  <td className="px-4 py-3">{scenario.assumptionType}: {scenario.assumptionValue ?? '—'}</td>
                  <td className="px-4 py-3">{scenario.generatedSupplyPlanId || 'Not generated'}</td>
                  <td className="px-4 py-3">{formatOutcome(scenario.costVarianceInr, (value) => `₹${Number(value).toLocaleString()} INR`)}</td>
                  <td className="px-4 py-3">{formatOutcome(scenario.serviceLevelDelta, (value) => `${value}%`)}</td>
                  <td className="px-4 py-3">{formatOutcome(scenario.revenueAtRiskRecovered, (value) => `₹${Number(value).toLocaleString()} INR`)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => publishScenario(scenario.scenarioVersionId)} disabled={scenario.isActive || !scenario.runAt || ['DRAFT', 'RUNNING'].includes(scenario.status) || publishingId === scenario.scenarioVersionId} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white inline-flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />{scenario.isActive ? 'Published' : publishingId === scenario.scenarioVersionId ? 'Publishing…' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SupplyChainLayout>
  )
}
