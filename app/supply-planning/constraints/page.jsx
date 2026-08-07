'use client'

import React, { useState, useEffect } from 'react'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  X,
  GitCommit,
  TrendingUp,
  ShieldAlert
} from 'lucide-react'

export default function ConstraintsPage() {
  const [constraints, setConstraints] = useState([])
  const [rootCauseTree, setRootCauseTree] = useState(null)
  const [execRecommendations, setExecRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDrawer, setActiveDrawer] = useState(null)

  useEffect(() => {
    async function fetchConstraintsData() {
      setLoading(true)
      try {
        const [resConst, resExec] = await Promise.all([
          fetch('/api/v1/supply-planning?action=constraints'),
          fetch('/api/v1/supply-planning?action=executive_recommendation_engine')
        ])

        const jsonConst = await resConst.json()
        const jsonExec = await resExec.json()

        if (jsonConst.success) setConstraints(jsonConst.data || [])
        if (jsonExec.success) setExecRecommendations(jsonExec.data || [])
      } catch (e) {
        console.error('Failed to load constraints:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchConstraintsData()
  }, [])

  const handleInspectDrawer = async (row) => {
    setActiveDrawer(row)
    try {
      const res = await fetch(`/api/v1/supply-planning?action=root_cause_analysis&constraintId=${row._id}`)
      const json = await res.json()
      if (json.success) {
        setRootCauseTree(json.data)
      }
    } catch (e) {
      console.error('Failed to fetch root cause tree:', e)
    }
  }

  return (
    <SupplyChainLayout activeTitle="Exception & Constraint Resolver">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Bottlenecks & Exceptions"
          value={constraints.length.toString()}
          subtitle="Triaged by severity & type"
          badgeText="Active Bottlenecks"
          badgeType="danger"
          loading={loading}
        />
        <KpiCard
          title="Revenue at Risk (INR)"
          value="₹1.5M INR"
          subtitle="1,200 units deficit in Week 41"
          badgeText="High Impact"
          badgeType="warning"
          loading={loading}
        />
        <KpiCard
          title="AI Resolution Engine"
          value="Active"
          subtitle="Diagnostic Recommendations Active"
          badgeText="AI Enabled"
          badgeType="success"
          loading={loading}
        />
      </div>

      {/* Executive Recommendation Engine Cards */}
      {execRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900/20 via-purple-900/20 to-slate-900/20 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Executive Decision & Trade-Off Recommendation Engine</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {execRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{rec.optionId}</span>
                  <StatusBadge status={rec.status} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{rec.description}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Cost: +₹{rec.costVarianceInr?.toLocaleString()}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">SLA: {rec.serviceLevelImpact}</span>
                  <span className="text-purple-600 dark:text-purple-400">Recovered: ₹{rec.revenueRecoveredInr?.toLocaleString()}</span>
                  <span className="text-amber-500">Score: {rec.recommendationScore}/100</span>
                </div>
                <button
                  onClick={() => alert(`Approved ${rec.optionId}: Executive Plan Promoted!`)}
                  className="w-full mt-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
                >
                  Approve Executive Trade-Off
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints Exception Matrix */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Active Supply Chain Constraint Exception Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-generated exception alerts for supply gaps, capacity breaches, and lead-time delays.
          </p>
        </div>

        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-6 bg-slate-150 dark:bg-slate-800/60 rounded w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Constraint Type</th>
                  <th className="px-4 py-3">SKU Code</th>
                  <th className="px-4 py-3">Source / Location</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">AI Recommendation</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {constraints.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => handleInspectDrawer(row)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{row.constraintType}</td>
                    <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400">{row.skuCode}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.constraintSource}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.severity} />
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.description}</td>
                    <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 max-w-xs truncate flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="truncate">{row.recommendedAction}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInspectDrawer(row)
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors text-[11px]"
                      >
                        Inspect AI Diagnostic Tree
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enhanced AI Diagnostic & Root Cause Side Drawer */}
      {activeDrawer && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 overflow-y-auto space-y-6 shadow-2xl animate-in slide-in-from-right duration-200 text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Root Cause Causal Tree & Diagnostic</h3>
              </div>
              <button
                onClick={() => {
                  setActiveDrawer(null)
                  setRootCauseTree(null)
                }}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Exception Target:</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{activeDrawer.constraintSource} ({activeDrawer.skuCode})</p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Severity Level:</span>
                <div className="mt-1"><StatusBadge status={activeDrawer.severity} /></div>
              </div>

              {/* Multi-Tier Root Cause Causal Tree */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold">
                  <GitCommit className="w-4 h-4" />
                  <span>Automated Multi-Tier Root Cause Tree:</span>
                </div>

                <div className="space-y-2 relative pl-3 border-l-2 border-indigo-500/40">
                  {(rootCauseTree?.causalTreeNodes || [
                    { step: 1, node: 'Upstream Demand Surge', detail: 'Marketing Q3 Campaign spike +20%' },
                    { step: 2, node: 'Component Arrival Delay', detail: 'BT Chipsets delayed 4 days by customs' },
                    { step: 3, node: 'Factory Line Bottleneck', detail: 'Noida Line 2 running at 112% overload' }
                  ]).map((node, nIdx) => (
                    <div key={nIdx} className="space-y-0.5">
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-900 dark:text-white">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">{node.step}</span>
                        <span>{node.node}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 font-mono">{node.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/50 p-4 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>AI Copilot Mitigating Strategy:</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {rootCauseTree?.recommendedMitigation || activeDrawer.recommendedAction}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  alert("Constraint marked as resolved!")
                  setActiveDrawer(null)
                  setRootCauseTree(null)
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Resolution Executed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SupplyChainLayout>
  )
}
