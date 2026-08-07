'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import KpiCard from '@/components/supply-chain/KpiCard'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import {
  Grid,
  AlertTriangle,
  ShoppingCart,
  Factory,
  Truck,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Activity,
  Layers
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

export default function SupplyOverviewPage() {
  const [data, setData] = useState(null)
  const [earlyWarnings, setEarlyWarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [resOverview, resWarnings] = await Promise.all([
          fetch('/api/v1/supply-planning?action=overview'),
          fetch('/api/v1/supply-planning?action=early_warning_system')
        ])
        const jsonOverview = await resOverview.json()
        const jsonWarnings = await resWarnings.json()

        if (jsonOverview.success) setData(jsonOverview.data)
        if (jsonWarnings.success) setEarlyWarnings(jsonWarnings.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const trendData = data?.demandVsSupplyTrend || []

  return (
    <SupplyChainLayout activeTitle="Supply Overview & Executive Cockpit">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-950/80 dark:via-slate-900 dark:to-purple-950/60 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Active Executive S&OP Horizon</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Supply Health & Operational Overview</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Real-time supply balancing across boAt TWS, Wearable, and Audio product portfolios. Consuming approved consensus demand feeds from upstream Demand Planning.
          </p>
        </div>
        <Link
          href="/supply-planning/workspace"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all whitespace-nowrap"
        >
          <span>Open Master Supply Workbench</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Predictive Early Warning Radar */}
      {earlyWarnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/40 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Predictive Early Warning Radar (4 to 12 Weeks Out)
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                <strong>{earlyWarnings[0]?.category} ({earlyWarnings[0]?.probability} Risk):</strong> {earlyWarnings[0]?.triggerDescription} ({earlyWarnings[0]?.horizonWeek})
              </p>
            </div>
          </div>
          <Link
            href="/supply-planning/constraints"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium shrink-0 transition-colors"
          >
            Inspect Diagnostic Tree
          </Link>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Order Fulfillment Rate"
          value={data ? `${data.serviceLevel}%` : '94.2%'}
          subtitle="198.2k units committed / 210.5k demand"
          trend="neutral"
          trendValue="Target SLA: 95.0%"
          loading={loading}
          error={error}
          badgeText="Target: 95%"
          badgeType="success"
        />
        <KpiCard
          title="Expected Stock Shortage"
          value={data ? `${data.totalDeficitUnits.toLocaleString()} Units` : '1,200 Units'}
          subtitle="₹18.0 Lakhs revenue risk in Week 34"
          trend="down"
          trendValue="Needs PO Requisition"
          loading={loading}
          error={error}
          badgeText="Action Required"
          badgeType="warning"
        />
        <KpiCard
          title="Factory Line Bottlenecks"
          value={data ? `${data.activeConstraintsCount} Alert` : '1 Alert'}
          subtitle="Noida Factory Line-2 overloaded in W34"
          trend="neutral"
          trendValue="Shift Rebalancing Required"
          loading={loading}
          error={error}
          badgeText="Attention"
          badgeType="danger"
        />
        <KpiCard
          title="Warehouse Stock Available"
          value={data ? `${(data.totalStockUnits / 1000).toFixed(1)}k Units` : '193.8k Units'}
          subtitle="43 Days of Stock Coverage across 4 DCs"
          trend="up"
          trendValue="Healthy Buffer"
          loading={loading}
          error={error}
          badgeText="Normal"
          badgeType="info"
        />
      </div>

      {/* Demand vs. Supply Trend Chart Component */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-colors duration-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <Activity className="w-4 h-4" />
              <span>Weekly Planning Trend</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Demand vs. Supply Comparison</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparing customer demand forecast against planned factory production and supplier purchase orders.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Customer Demand</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Planned Supply</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[320px] w-full pt-2">
          {loading ? (
            <div className="h-full w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
              Loading Demand vs. Supply trend series...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const demand = payload[0]?.value || 0
                      const supply = payload[1]?.value || 0
                      const gap = demand - supply
                      return (
                        <div className="bg-slate-900 text-slate-100 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-sans space-y-1.5 min-w-[180px]">
                          <p className="font-bold text-white border-b border-slate-800 pb-1 font-mono">{label}</p>
                          <div className="flex justify-between items-center text-indigo-300">
                            <span>Consensus Demand:</span>
                            <strong className="font-mono text-white">{demand.toLocaleString()} Units</strong>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>Committed Supply:</span>
                            <strong className="font-mono text-white">{supply.toLocaleString()} Units</strong>
                          </div>
                          {gap > 0 && (
                            <div className="flex justify-between items-center text-rose-400 font-semibold pt-1 border-t border-slate-800">
                              <span>Supply Deficit Gap:</span>
                              <strong className="font-mono text-rose-400">{gap.toLocaleString()} Units</strong>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="demand"
                  name="Consensus Demand"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorDemand)"
                />
                <Area
                  type="monotone"
                  dataKey="totalSupply"
                  name="Committed Supply"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSupply)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Launch Workbenches */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
          <PackageCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Operational Planning Workbenches</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/supply-planning/workspace"
            className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 p-5 rounded-xl transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                <Grid className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Master Supply Workbench</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              52-week time-phased MRP netting grid, gross forecast, planned production, and stock balances.
            </p>
          </Link>

          <Link
            href="/supply-planning/capacity"
            className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 p-5 rounded-xl transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
                <Factory className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Capacity & Resource Planning</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Plant rough-cut capacity utilization heatmaps, assembly line load balancing, and work order dispatching.
            </p>
          </Link>

          <Link
            href="/supply-planning/procurement"
            className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 p-5 rounded-xl transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Procurement Execution POs</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Purchase order release queue, MOQ lot size multiples rounding, and supplier split allocations.
            </p>
          </Link>
        </div>
      </div>
    </SupplyChainLayout>
  )
}
