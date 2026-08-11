'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Factory,
  IndianRupee,
  GitBranch,
  Bot,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Sparkles,
  Filter,
  Download,
  Plus,
  CircleUser,
  Database,
  Truck,
  Wallet,
  Flame,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  FileEdit,
  Check,
  CalendarDays,
  Clock,
  Activity,
  Zap,
  MapPin,
  Target,
  Users,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  Megaphone,
  BarChart3,
  Grid3x3,
  Warehouse,
  BrainCircuit,
  Rocket,
  CircleGauge,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  fmtInrMoney as fmtMoney,
  DEMO_INR_PER_USD,
  CASHFLOW_ORDER_LOW_INR,
  CASHFLOW_ORDER_HIGH_INR,
  ORDER_CASHFLOW_METER_MAX_INR,
} from '@/lib/utils'
import { PLANNING_ROLES, ROLE_PROFILES, ROLE_STORAGE_KEY, canAccessDemandSection, canAccessRootTab } from '@/lib/roleAccess'

// =============== NAVIGATION CONFIG ===============
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'demand', label: 'Demand Planning', icon: TrendingUp },
  { id: 'factors', label: 'Demand Factors', icon: Activity },
  { id: 'orders', label: 'Distributor Orders', icon: Package },
  { id: 'dispatch', label: 'Order vs Dispatch', icon: BarChart3 },
  { id: 'supply', label: 'Supply Planning', icon: Factory },
  { id: 'inventory', label: 'Inventory Planning', icon: Warehouse },
  { id: 'financial', label: 'Financial Planning', icon: IndianRupee },
  { id: 'scenario', label: 'Scenario Planning', icon: GitBranch },
  { id: 'chatbot', label: 'Chatbot', icon: Bot },
]
const BRAND_LOGO_URL = '/vanco-only-logo.png'

// =============== CENTRAL DATA HOOK ===============
// Pulls the generated electronics dataset from /api/data/* and caches it in state.
// Every page consumes this same object so numbers stay consistent.
function useSopData() {
  const [data, setData] = useState({
    loading: true,
    meta: null,
    skus: [],
    distributors: [],
    regions: [],
    weeks: [],
    kpis: null,
    byWeek: [],
    bySku: [],
    byDistributor: [],
    byRegion: [],
    weekly: [],
    dashboardAlerts: [],
    scenarios: [],
    factorConfig: null,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const j = (url) => fetch(url).then((r) => r.json())
        const [meta, skus, distributors, regions, weeks, kpis, byWeek, bySku, byDist, byReg, weekly, alertPayload, scenarioPayload, factorConfig] = await Promise.all([
          j('/api/data/meta'),
          j('/api/data/skus'),
          j('/api/data/distributors'),
          j('/api/data/regions'),
          j('/api/data/weeks'),
          j('/api/data/kpis'),
          j('/api/data/aggregate?by=weekId'),
          j('/api/data/aggregate?by=skuId'),
          j('/api/data/aggregate?by=distributorId'),
          j('/api/data/aggregate?by=region'),
          j('/api/data/weekly'),
          j('/api/dashboard/alerts'),
          j('/api/scenarios'),
          j('/api/demand/factor-config'),
        ])
        if (cancelled) return
        setData({
          loading: false,
          meta, skus, distributors, regions, weeks, kpis,
          byWeek: byWeek.rows || [],
          bySku: bySku.rows || [],
          byDistributor: byDist.rows || [],
          byRegion: byReg.rows || [],
          weekly: weekly.rows || [],
          dashboardAlerts: alertPayload.rows || [],
          scenarios: scenarioPayload.rows || [],
          factorConfig,
        })
      } catch (e) {
        console.error('Data load failed', e)
        if (!cancelled) setData((d) => ({ ...d, loading: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return data
}

// Format helpers
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0))

// =============== REUSABLE: KPI CARD ===============
function KpiCard({ title, value, change, trend = 'up', subtitle, icon: Icon, accent = 'blue' }) {
  const accents = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  const trendColor = trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight
  return (
    <Card className="border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <h3 className="text-2xl font-semibold text-slate-900">{value}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={`rounded-lg p-2.5 ${accents[accent]}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {change && (
          <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{change}</span>
            <span className="text-slate-500 font-normal">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============== REUSABLE: DATA TABLE ===============
function DataTable({ columns, rows, renderCell }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-slate-50">
            {columns.map((col) => (
              <TableHead key={col.key} className="text-slate-600 font-medium text-xs uppercase tracking-wide">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx} className="hover:bg-slate-50/60">
              {columns.map((col) => (
                <TableCell key={col.key} className="py-3 text-sm">
                  {renderCell ? renderCell(col, row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// =============== REUSABLE: SECTION HEADER ===============
function SectionHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// =============== PAGE: DASHBOARD ===============
const DASHBOARD_ROLE_LENSES = {
  Production: { permissions: ['demand', 'category', 'region', 'supply', 'inventory', 'scenario'] },
  Sourcing: { permissions: ['demand', 'category', 'supply', 'inventory', 'scenario'] },
  'S&OP': { permissions: ['commercial', 'finance', 'demand', 'category', 'channel', 'region', 'supply', 'inventory', 'scenario'] },
  NPI: { permissions: ['demand', 'category', 'supply', 'inventory', 'scenario'] },
  Category: { permissions: ['demand', 'category', 'channel', 'region', 'inventory', 'scenario'] },
  Sales: { permissions: ['commercial', 'demand', 'category', 'channel', 'region', 'inventory', 'scenario'] },
  Finance: { permissions: ['commercial', 'finance', 'category', 'channel', 'region', 'inventory', 'scenario'] },
}

function buildWhatIfScenarioComparison(kpis, assumptions = {}) {
  const demandPct = Number(assumptions.demandPct || 0)
  const costPct = Number(assumptions.costPct || 0)
  const capacityPct = Number(assumptions.capacityPct || 0)
  const totalRev = (kpis?.totalRevenue || 11_400_000_000) / 1_000_000
  const totalGm = (kpis?.totalGm || 2_800_000_000) / 1_000_000
  const quarterlyBaseline = totalRev / 4
  const quarterlyGmBase = totalGm / 4
  return ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
    const baseline = quarterlyBaseline
    const requestedFactor = 1 + demandPct / 100
    const capacityFactor = Math.max(0, 1.2 * (1 + capacityPct / 100))
    const deliverableFactor = Math.min(requestedFactor, capacityFactor)
    const scenario = baseline * deliverableFactor
    const baselineCogs = quarterlyBaseline - quarterlyGmBase
    const cogs = baselineCogs * (1 + costPct / 100) * deliverableFactor
    return { q, baseline: +baseline.toFixed(1), scenario: +scenario.toFixed(1), gm: +(scenario - cogs).toFixed(1), constrainedRevenue: +Math.max(0, baseline * requestedFactor - scenario).toFixed(1) }
  })
}

function DashboardPage({ data, workspaceRole = 'S&OP' }) {
  const [planBalance, setPlanBalance] = useState(null)
  const [planBalanceError, setPlanBalanceError] = useState(null)
  const [planRefreshing, setPlanRefreshing] = useState(false)
  const [reviewCut, setReviewCut] = useState('category')
  const [reviewCycle, setReviewCycle] = useState(null)

  const loadPlanBalance = useCallback(async (quiet = false) => {
    if (!quiet) setPlanRefreshing(true)
    try {
      const response = await fetch('/api/dashboard/plan-balance', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Could not load plan balance')
      setPlanBalance(json)
      setPlanBalanceError(null)
    } catch (error) {
      setPlanBalanceError(error.message)
    } finally {
      if (!quiet) setPlanRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPlanBalance()
    const timer = setInterval(() => loadPlanBalance(true), 30_000)
    return () => clearInterval(timer)
  }, [loadPlanBalance])

  useEffect(() => {
    fetch('/api/dashboard/review-cycle').then((response) => response.json()).then(setReviewCycle).catch(() => {})
  }, [])

  const updateReviewCycle = useCallback(async (changes) => {
    const response = await fetch('/api/dashboard/review-cycle', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...changes, actorRole: workspaceRole }) })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update review cycle')
    setReviewCycle(json.row)
  }, [workspaceRole])

  const roleLens = { ...DASHBOARD_ROLE_LENSES[workspaceRole], description: ROLE_PROFILES[workspaceRole]?.description }
  const canView = (permission) => roleLens.permissions.includes(permission)
  const allowedCuts = useMemo(() => ['category', 'channel', 'region'].filter((cut) => roleLens.permissions.includes(cut)), [roleLens])

  useEffect(() => {
    if (!allowedCuts.includes(reviewCut)) setReviewCut(allowedCuts[0] || 'category')
  }, [workspaceRole, reviewCut, allowedCuts])

  // Build chart data from the live aggregated weekly rows
  const revenueData = useMemo(() => {
    const byWeek = new Map()
    ;(data.weekly || []).forEach((row) => {
      const current = byWeek.get(row.weekId) || { actual: 0, plan: 0 }
      current.actual += Number(row.tertiary || 0) * Number(row.price || 0)
      current.plan += Number(row.secondary || 0) * Number(row.price || 0)
      byWeek.set(row.weekId, current)
    })
    return Array.from(byWeek.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([week, values]) => ({
      m: week,
      actual: +(values.actual / 1_000_000).toFixed(2),
      plan: +(values.plan / 1_000_000).toFixed(2),
    }))
  }, [data.weekly])

  // Category mix from SKU-level aggregation
  const categoryMix = useMemo(() => {
    const palette = {
      'TWS Earbuds': '#3b82f6',
      'Neckbands': '#10b981',
      'Smartwatches': '#f59e0b',
      'Wired Audio': '#8b5cf6',
      'Portable Speakers': '#ec4899',
    }
    const bySku = data.bySku || []
    const skuMap = Object.fromEntries((data.skus || []).map((s) => [s.id, s.category]))
    const totals = {}
    bySku.forEach((r) => {
      const cat = skuMap[r.key] || 'Other'
      totals[cat] = (totals[cat] || 0) + r.revenue
    })
    const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1
    return Object.entries(totals).map(([name, v]) => ({
      name,
      value: Math.round((v / grand) * 100),
      color: palette[name] || '#64748b',
    }))
  }, [data.bySku, data.skus])

  // Top SKUs by revenue
  const topSkus = useMemo(() => {
    const skuMap = Object.fromEntries((data.skus || []).map((s) => [s.id, s]))
    return (data.bySku || [])
      .map((r) => {
        const s = skuMap[r.key] || {}
        const half = Math.floor((data.weeks || []).length / 2)
        // growth = last-half revenue vs first-half revenue (from weekly rows)
        const wk = (data.weekly || []).filter((x) => x.skuId === r.key)
        const first = wk.slice(0, half).reduce((a, b) => a + b.revenue, 0)
        const second = wk.slice(half).reduce((a, b) => a + b.revenue, 0)
        const growth = first ? ((second - first) / first) * 100 : 0
        const status = growth > 10 ? 'Growth' : growth < -3 ? 'At Risk' : 'On Track'
        return { sku: r.key, name: s.name, category: s.category, revenue: r.revenue, rev: fmtMoney(r.revenue), growth, status }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(({ revenue: _rev, ...row }) => row)
  }, [data.bySku, data.skus, data.weekly, data.weeks])

  const k = data.kpis || {}
  const alerts = (data.dashboardAlerts || []).map((alert) => ({
    sev: alert.severity,
    title: alert.title,
    time: alert.occurredAt ? new Date(alert.occurredAt).toLocaleDateString() : '',
  }))

  const cutRows = useMemo(() => {
    const groups = new Map()
    ;(data.weekly || []).forEach((row) => {
      const key = reviewCut === 'category' ? row.category : reviewCut === 'channel' ? row.distributor : row.region
      if (!groups.has(key)) groups.set(key, { name: key, forecastUnits: 0, actualUnits: 0, primaryUnits: 0, revenue: 0 })
      const group = groups.get(key)
      group.forecastUnits += row.secondary || 0
      group.actualUnits += row.tertiary || 0
      group.primaryUnits += row.primary || 0
      group.revenue += row.revenue || 0
    })
    return Array.from(groups.values()).map((row) => ({ ...row, biasPct: row.actualUnits ? (row.forecastUnits - row.actualUnits) / row.actualUnits * 100 : 0, attainmentPct: row.forecastUnits ? row.actualUnits / row.forecastUnits * 100 : 0 })).sort((a, b) => b.revenue - a.revenue)
  }, [data.weekly, reviewCut])

  const scenarioComparison = useMemo(() => (data.scenarios || []).map((stored) => {
    const scenario = {
      name: stored.scenarioName,
      demandPct: stored.assumptionType === 'DEMAND_SURGE' ? Number(stored.assumptionValue || 0) : 0,
      costPct: stored.assumptionType === 'COST_SHIFT' ? Number(stored.assumptionValue || 0) : 0,
      capacityPct: stored.assumptionType === 'CAPACITY_CHANGE' ? Number(stored.assumptionValue || 0) : 0,
    }
    const quarters = buildWhatIfScenarioComparison(data.kpis, scenario)
    return { ...scenario, revenue: quarters.reduce((sum, row) => sum + row.scenario, 0), gm: quarters.reduce((sum, row) => sum + row.gm, 0), constrainedRevenue: quarters.reduce((sum, row) => sum + row.constrainedRevenue, 0) }
  }), [data.kpis, data.scenarios])

  return (
    <div>
      <SectionHeader
        title="S&OP Executive Dashboard"
        description={`Integrated view across ${data.meta?.skuCount || 0} SKUs · ${data.meta?.distributorCount || 0} distributors · ${data.meta?.weekCount || 0} weeks`}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => loadPlanBalance()} disabled={planRefreshing}><RotateCw className={`h-4 w-4 ${planRefreshing ? 'animate-spin' : ''}`} />Live refresh</Button>
            <Button size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <Card className="border-blue-200/70 bg-blue-50/30 shadow-sm mb-6"><CardContent className="p-4"><div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Badge className="bg-blue-600 hover:bg-blue-600">{workspaceRole} lens</Badge><span className="text-sm font-medium text-slate-800">Permission-gated review workspace</span></div><p className="text-xs text-slate-600 mt-1">{roleLens.description}</p></div>{reviewCycle && <div className="flex flex-wrap items-center gap-2"><Select value={reviewCycle.cadence} onValueChange={(cadence) => updateReviewCycle({ action: 'set_cadence', cadence })}><SelectTrigger className="w-[150px] h-9 bg-white"><SelectValue /></SelectTrigger><SelectContent>{['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ON_DEMAND'].map((value) => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}</SelectContent></Select><Badge variant="outline" className="bg-white">{reviewCycle.status.replace('_', ' ')}</Badge><span className="text-xs text-slate-500">Next: {reviewCycle.nextReviewAt ? new Date(reviewCycle.nextReviewAt).toLocaleDateString() : 'On demand'}</span><Button size="sm" variant="outline" disabled={reviewCycle.completedRoles.includes(workspaceRole)} onClick={() => updateReviewCycle({ action: 'mark_reviewed' })}>{reviewCycle.completedRoles.includes(workspaceRole) ? 'Reviewed' : 'Mark reviewed'}</Button>{workspaceRole === 'S&OP' && <Button size="sm" onClick={() => updateReviewCycle({ action: reviewCycle.status === 'CLOSED' ? 'open_cycle' : 'close_cycle' })}>{reviewCycle.status === 'CLOSED' ? 'Open cycle' : 'Close cycle'}</Button>}</div>}</div></CardContent></Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {canView('commercial') && <KpiCard title="Total Revenue" value={fmtMoney(k.totalRevenue)} change={`${k.demandWoW >= 0 ? '+' : ''}${k.demandWoW || 0}% WoW`} trend={k.demandWoW >= 0 ? 'up' : 'down'} subtitle={`${data.meta?.weekCount || 0}w window`} icon={IndianRupee} accent="green" />}
        {canView('finance') && <KpiCard title="Gross Margin" value={`${k.gmPct || 0}%`} change={fmtMoney(k.totalGm)} subtitle="value" icon={TrendingUp} accent="blue" />}
        {canView('demand') && <KpiCard title="Primary Sales" value={`${fmtNum((k.totalPrimary || 0) / 1000)}K`} subtitle="units shipped" icon={Package} accent="amber" />}
        {canView('demand') && <KpiCard title="Tertiary Demand" value={`${fmtNum((k.totalDemand || 0) / 1000)}K`} subtitle="units sold-out" icon={Factory} accent="purple" />}
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2"><div><CardTitle className="text-base">Continuous Demand vs Supply View</CardTitle><CardDescription>Live 26-week forecast, constrained capacity, dated PO commitments, operating plan and rolling inventory position.</CardDescription></div><div className="flex flex-wrap items-center gap-2">{planBalance?.isLive && <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">LIVE · 30s</Badge>}{planBalance?.summary && <Badge className={planBalance.summary.deficitWeeks ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'}>{planBalance.summary.deficitWeeks} risk week(s)</Badge>}</div></div>
        </CardHeader>
        <CardContent className="space-y-5">
          {planBalanceError ? <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{planBalanceError}</div> : !planBalance ? <div className="py-16 text-center text-sm text-slate-500">Loading integrated demand and supply plan…</div> : <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-700">Net Supply Coverage</p><p className="text-xl font-semibold text-blue-900">{planBalance.summary.coveragePct}%</p></div><div className="rounded-lg bg-rose-50 p-3"><p className="text-xs text-rose-700">Unmet Demand</p><p className="text-xl font-semibold text-rose-900">{fmtNum(planBalance.summary.deficitUnits)}</p></div><div className="rounded-lg bg-cyan-50 p-3"><p className="text-xs text-cyan-700">Current Inventory</p><p className="text-xl font-semibold text-cyan-900">{fmtNum(planBalance.summary.currentInventoryUnits)}</p></div><div className="rounded-lg bg-orange-50 p-3"><p className="text-xs text-orange-700">Ending Inventory</p><p className="text-xl font-semibold text-orange-900">{fmtNum(planBalance.summary.projectedEndingInventoryUnits)}</p></div>{canView('supply') && <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-700">Capacity Risk Weeks</p><p className="text-xl font-semibold text-amber-900">{planBalance.summary.capacityRiskWeeks}</p></div>}{(canView('supply') || canView('finance')) && <div className="rounded-lg bg-violet-50 p-3"><p className="text-xs text-violet-700">Open PO Pipeline</p><p className="text-xl font-semibold text-violet-900">{fmtNum(planBalance.summary.openPoUnits)}</p></div>}</div>
            <ResponsiveContainer width="100%" height={340}><LineChart data={planBalance.rows}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 10 }} interval={1} /><YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => `${Number(value).toLocaleString()} units`} /><Legend /><Line type="monotone" dataKey="forecastUnits" name="Current Demand Plan" stroke="#2563eb" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="netSupplyUnits" name="Net Supply" stroke="#10b981" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="operatingPlanUnits" name="Operating Plan" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 4" dot={false} /><Line type="monotone" dataKey="projectedInventoryUnits" name="Projected Inventory" stroke="#f97316" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer>
            {canView('supply') && <DataTable columns={[{ key: 'bucket', label: 'Bucket / Horizon' }, { key: 'planningWeek', label: 'Supply Week' }, { key: 'forecastUnits', label: 'Demand Plan' }, { key: 'netSupplyUnits', label: 'Net Supply' }, { key: 'confirmedPoReceipts', label: 'Dated PO Receipts' }, { key: 'openingInventoryUnits', label: 'Opening Inventory' }, { key: 'projectedInventoryUnits', label: 'Projected Inventory' }, { key: 'unmetDemandUnits', label: 'Unmet Demand' }, { key: 'status', label: 'Status' }]} rows={planBalance.rows.filter((row) => row.status !== 'COVERED').slice(0, 10)} renderCell={(col, row) => { if (col.key === 'bucket') return <div><p>{row.bucket}</p><p className="text-[10px] text-slate-500">{row.horizon}</p></div>; if (['forecastUnits', 'netSupplyUnits', 'confirmedPoReceipts', 'openingInventoryUnits', 'projectedInventoryUnits', 'unmetDemandUnits'].includes(col.key)) return <span className={col.key === 'unmetDemandUnits' && row.unmetDemandUnits > 0 ? 'text-rose-600 font-medium' : ''}>{Number(row[col.key]).toLocaleString()}</span>; if (col.key === 'status') return <Badge className={['STOCKOUT','INVENTORY_RISK','DEFICIT'].includes(row.status) ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' : 'bg-amber-50 text-amber-700 hover:bg-amber-50'}>{row.status.replaceAll('_', ' ')}</Badge>; return row[col.key] }} />}
            <p className="text-xs text-slate-500">Forecast: {planBalance.sources.forecast} · Net supply: {planBalance.sources.netSupply} · Operating plan: {planBalance.sources.operatingPlan}</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><p><span className="font-medium text-slate-800">Demand:</span> {planBalance.sources.forecast}</p><p><span className="font-medium text-slate-800">Supply:</span> {planBalance.sources.netSupply}</p><p><span className="font-medium text-slate-800">Inventory:</span> {planBalance.sources.inventory}</p><p className="mt-1 text-slate-500">Calculated {new Date(planBalance.freshness.generatedAt).toLocaleString()} · auto-refresh every {planBalance.freshness.refreshSeconds}s</p></div>
          </>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><CardTitle className="text-base">S&OP Review Cuts</CardTitle><CardDescription>Same plan summarized through the dimensions permitted for the {workspaceRole} workspace.</CardDescription></div><Select value={reviewCut} onValueChange={setReviewCut}><SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger><SelectContent>{allowedCuts.map((cut) => <SelectItem key={cut} value={cut}>By {cut}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent><DataTable columns={[{ key: 'name', label: reviewCut === 'channel' ? 'Channel Partner' : reviewCut === 'region' ? 'Region' : 'Category' }, { key: 'forecastUnits', label: 'Forecast' }, { key: 'actualUnits', label: 'Actual' }, { key: 'biasPct', label: 'Bias' }, { key: 'attainmentPct', label: 'Attainment' }, ...(canView('commercial') ? [{ key: 'revenue', label: 'Revenue' }] : [])]} rows={cutRows} renderCell={(col, row) => { if (['forecastUnits', 'actualUnits'].includes(col.key)) return Number(row[col.key]).toLocaleString(); if (col.key === 'biasPct') return <span className={Math.abs(row.biasPct) > 10 ? 'text-rose-600 font-medium' : 'text-slate-700'}>{row.biasPct >= 0 ? '+' : ''}{row.biasPct.toFixed(1)}%</span>; if (col.key === 'attainmentPct') return `${row.attainmentPct.toFixed(1)}%`; if (col.key === 'revenue') return fmtMoney(row.revenue); return row[col.key] }} /></CardContent></Card>
        <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">What-If Scenario Comparison</CardTitle><CardDescription>Read-only comparison from the shared Scenario Planning engine; create and tune assumptions in Scenario Planning.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={250}><BarChart data={scenarioComparison}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value)}M`} /><Tooltip formatter={(value) => `₹${Number(value).toFixed(1)}M`} /><Legend /><Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="gm" name="Gross Margin" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer><div className="grid grid-cols-2 gap-2 mt-3">{scenarioComparison.map((scenario) => <div key={scenario.name} className="rounded border border-slate-200 p-2 text-xs"><p className="font-medium text-slate-800">{scenario.name}</p><p className="text-slate-500">Demand {scenario.demandPct >= 0 ? '+' : ''}{scenario.demandPct}% · Cost {scenario.costPct >= 0 ? '+' : ''}{scenario.costPct}% · Capacity {scenario.capacityPct >= 0 ? '+' : ''}{scenario.capacityPct}%</p>{scenario.constrainedRevenue > 0 && <p className="text-rose-600 mt-1">₹{scenario.constrainedRevenue.toFixed(1)}M constrained</p>}</div>)}</div></CardContent></Card>
      </div>

      {(canView('commercial') || canView('category')) && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {canView('commercial') && <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue: Plan vs Actual</CardTitle>
                <CardDescription>Weekly consensus plan tracking (₹M = million INR) · live data</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">On Track</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="basis" dataKey="plan" stroke="#3b82f6" strokeWidth={2} fill="url(#gPlan)" />
                <Area type="basis" dataKey="actual" stroke="#10b981" strokeWidth={2} fill="url(#gActual)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>}

        {canView('category') && <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Mix</CardTitle>
            <CardDescription>Revenue share · 6 month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryMix} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {categoryMix.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {categoryMix.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                    <span className="text-slate-700">{c.name}</span>
                  </div>
                  <span className="text-slate-500 font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>}
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top SKUs by Revenue</CardTitle>
            <CardDescription>6 month window · all regions</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'sku', label: 'SKU' },
                { key: 'name', label: 'Product' },
                { key: 'category', label: 'Category' },
                ...(canView('commercial') ? [{ key: 'rev', label: 'Revenue' }] : []),
                { key: 'growth', label: 'Growth' },
                { key: 'status', label: 'Status' },
              ]}
              rows={topSkus}
              renderCell={(col, row) => {
                if (col.key === 'status') {
                  const map = { 'On Track': 'bg-emerald-50 text-emerald-700', 'At Risk': 'bg-rose-50 text-rose-700', 'Growth': 'bg-blue-50 text-blue-700' }
                  return <Badge variant="secondary" className={`${map[row.status]} hover:${map[row.status]}`}>{row.status}</Badge>
                }
                if (col.key === 'growth') {
                  const v = row.growth || 0
                  const positive = v >= 0
                  return <span className={positive ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>{positive ? '+' : ''}{v.toFixed(1)}%</span>
                }
                return row[col.key]
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alerts & Exceptions</CardTitle>
            <CardDescription>{alerts.length} active items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a, i) => {
              const sevMap = { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-blue-500' }
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <span className={`mt-1.5 h-2 w-2 rounded-full ${sevMap[a.sev]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.time}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =============== DEMAND PLANNING: CHANNEL/PARTNER MASTER HELPERS ===============
// Distributors ARE the channel-partner master for this dataset (each is a
// named "Channel Partners" / regional distribution hub) — reused as-is
// rather than inventing a separate master, per Data Foundation principle
// of not duplicating an entity that already exists in the live dataset.
const LISTING_STATUS_OPTIONS = ['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED', 'DELISTED']
const CHANNEL_TYPE_OPTIONS = ['ONLINE_MARKETPLACE', 'MODERN_TRADE_ONLINE', 'MODERN_TRADE_OFFLINE', 'QUICK_COMMERCE', 'D2C', 'GENERAL_TRADE', 'EXPORT', 'B2B']
const CHANNEL_SOURCE_OPTIONS = ['API_PULL', 'WEBHOOK', 'EDI_SFTP', 'BRAND_PORTAL_EXPORT', 'INTERNAL_API', 'MANUAL_UPLOAD']
const CHANNEL_DATA_DOMAINS = ['TERTIARY_SALES', 'CHANNEL_STOCK', 'DOS', 'RETURNS']
const LISTING_STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING_ACTIVATION: 'bg-sky-50 text-sky-700 border-sky-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  DELISTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

// =============== SUB-PAGE: CHANNEL PARTNER DATA INTEGRATION ===============
function ChannelPartnerIntegrationPanel({ rows, onUpdate, onMarkReceived, loading }) {
  const healthyCount = rows.filter((r) => r.healthStatus === 'HEALTHY').length
  const degradedCount = rows.length - healthyCount
  const recordsIngested = rows.reduce((sum, row) => sum + row.recordCount, 0)

  if (loading) return <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading channel integration registry…</CardContent></Card>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Channel Partners Ingested" value={rows.length.toString()} subtitle={`${healthyCount} healthy · ${degradedCount} degraded`} icon={Users} accent="blue" />
        <KpiCard title="Feed Records Available" value={recordsIngested.toLocaleString()} subtitle="Sell-through, stock and DOS records" icon={Database} accent="green" />
        <KpiCard title="Overall Ingestion Health" value={degradedCount === 0 ? 'Healthy' : 'Attention'} subtitle="Per-partner feed freshness & sync status" icon={degradedCount === 0 ? CheckCircle2 : AlertTriangle} accent={degradedCount === 0 ? 'green' : 'amber'} />
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Channel Partner Data Integration — Ingestion Status</CardTitle>
          <CardDescription>Configure each partner's channel classification, inbound feed protocol, data availability and freshness SLA. Order placement remains in Distributor Orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name', label: 'Channel Partner' },
              { key: 'channelType', label: 'Channel Type' },
              { key: 'sourceType', label: 'Source Protocol' },
              { key: 'domains', label: 'Data Available' },
              { key: 'records', label: 'Feed Records' },
              { key: 'lastSync', label: 'Last Sync' },
              { key: 'freshness', label: 'Cadence / Freshness' },
              { key: 'status', label: 'Status' },
              { key: 'gap', label: 'Gap Flag' },
            ]}
            rows={rows}
            renderCell={(col, row) => {
              if (col.key === 'name') return (
                <div>
                  <div className="font-medium text-slate-900">{row.distributorName}</div>
                  <div className="text-xs text-slate-500">{row.distributorId} · {row.region} · Tier {row.tier}</div>
                </div>
              )
              if (col.key === 'channelType') return (
                <Select value={row.channelType} onValueChange={(value) => onUpdate(row.distributorId, { channelType: value })}>
                  <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNEL_TYPE_OPTIONS.map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              )
              if (col.key === 'sourceType') return (
                <Select value={row.sourceType} onValueChange={(value) => onUpdate(row.distributorId, { sourceType: value })}>
                  <SelectTrigger className="h-8 w-[135px] text-xs font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNEL_SOURCE_OPTIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
              )
              if (col.key === 'domains') return <div className="flex flex-wrap gap-1 max-w-[205px]">{CHANNEL_DATA_DOMAINS.map((domain) => {
                const enabled = row.dataDomains.includes(domain)
                const nextDomains = enabled ? row.dataDomains.filter((item) => item !== domain) : [...row.dataDomains, domain]
                return <button key={domain} onClick={() => onUpdate(row.distributorId, { dataDomains: nextDomains })} className={`rounded border px-1.5 py-0.5 text-[9px] ${enabled ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-400 line-through'}`}>{domain.replaceAll('_', ' ')}</button>
              })}</div>
              if (col.key === 'records') return <div><span className="font-medium">{row.recordCount}</span><div className="text-[10px] text-slate-500">{row.activeListings} active listings</div></div>
              if (col.key === 'lastSync') return <div className="space-y-1"><span className="text-xs text-slate-500 whitespace-nowrap">{new Date(row.lastSyncAt).toLocaleString()}</span><button onClick={() => onMarkReceived(row.distributorId)} className="block text-[10px] text-blue-600 hover:text-blue-800">Mark feed received</button></div>
              if (col.key === 'freshness') return (
                <Select value={String(row.expectedCadenceHours)} onValueChange={(value) => onUpdate(row.distributorId, { expectedCadenceHours: Number(value) })}>
                  <SelectTrigger className="h-8 w-[105px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{[4, 8, 12, 24, 48].map((hours) => <SelectItem key={hours} value={String(hours)}>{hours}h SLA</SelectItem>)}</SelectContent>
                </Select>
              )
              if (col.key === 'status') return (
                <Badge variant="secondary" className={`${row.healthStatus === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} hover:bg-inherit`}>
                  {row.healthStatus} · {row.freshnessHours}h
                </Badge>
              )
              if (col.key === 'gap') return row.gapFlag
                ? <span className="text-xs text-amber-700 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{row.gapFlag}</span>
                : <span className="text-xs text-slate-400">—</span>
              return row[col.key]
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =============== SUB-PAGE: PRODUCT/PARTNER LISTING MASTER ===============
function ListingMasterPanel({ skus, distributors, listingRows, onChangeStatus }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const total = listingRows.length
  const activeCount = listingRows.filter((l) => l.status === 'ACTIVE').length
  const pendingCount = listingRows.filter((l) => l.status === 'PENDING_ACTIVATION').length
  const suspendedCount = listingRows.filter((l) => l.status === 'SUSPENDED').length
  const delistedCount = listingRows.filter((l) => l.status === 'DELISTED').length
  const coveragePct = total > 0 ? ((activeCount / total) * 100).toFixed(1) : '0.0'

  const findListing = (skuId, distId) => listingRows.find((l) => l.skuId === skuId && l.distributorId === distId)

  const saveDetails = async () => {
    if (!editing) return
    setSaving(true)
    await onChangeStatus(editing.listingId, {
      status: editing.status,
      effectiveDate: editing.effectiveDate,
      delistingDate: editing.delistingDate || null,
      region: editing.region,
      moq: Number(editing.moq),
      exclusivity: !!editing.exclusivity,
    })
    setSaving(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Active Listing Coverage" value={`${coveragePct}%`} subtitle={`${activeCount} of ${total} SKU x Partner cells`} icon={CheckCircle2} accent="green" />
        <KpiCard title="Pending / Suspended" value={(pendingCount + suspendedCount).toString()} subtitle="Awaiting activation or on hold" icon={Clock} accent="amber" />
        <KpiCard title="Delisted Combinations" value={delistedCount.toString()} subtitle="Blocked from channel forecast eligibility" icon={X} accent="rose" />
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Grid3x3 className="h-4 w-4 text-blue-600" />SKU x Channel-Partner Listing Matrix</CardTitle>
          <CardDescription>Governs which SKUs are sellable through which distribution partners. A DELISTED cell blocks that combination from carrying an active channel forecast.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto border border-slate-200 rounded-lg">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-slate-50">
                  <TableHead className="text-xs uppercase tracking-wide text-slate-600 sticky left-0 bg-slate-50">SKU</TableHead>
                  {distributors.map((d) => (
                    <TableHead key={d.id} className="text-xs uppercase tracking-wide text-slate-600 whitespace-nowrap">{d.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <TableRow key={sku.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-2.5 sticky left-0 bg-white">
                      <div className="font-medium text-slate-900 text-sm">{sku.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{sku.id}</div>
                    </TableCell>
                    {distributors.map((d) => {
                      const listing = findListing(sku.id, d.id)
                      const status = listing?.status || 'PENDING_ACTIVATION'
                      return (
                        <TableCell key={d.id} className="py-2">
                          <Select value={status} disabled={!listing} onValueChange={(value) => onChangeStatus(listing.listingId, { status: value })}>
                            <SelectTrigger className={`h-8 text-xs font-medium ${LISTING_STATUS_STYLES[status]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LISTING_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt.replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button disabled={!listing} onClick={() => setEditing({ ...listing })} className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 disabled:text-slate-300">Manage details</button>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Listing Record</DialogTitle>
            <DialogDescription>{editing?.skuName} × {editing?.distributorName}</DialogDescription>
          </DialogHeader>
          {editing && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Listing Status</label><Select value={editing.status} onValueChange={(value) => setEditing((row) => ({ ...row, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LISTING_STATUS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Region Availability</label><Input value={editing.region || ''} onChange={(e) => setEditing((row) => ({ ...row, region: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Effective Date</label><Input type="date" value={editing.effectiveDate || ''} onChange={(e) => setEditing((row) => ({ ...row, effectiveDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">De-listing Date</label><Input type="date" value={editing.delistingDate || ''} onChange={(e) => setEditing((row) => ({ ...row, delistingDate: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Minimum Order Quantity</label><Input type="number" min="0" value={editing.moq} onChange={(e) => setEditing((row) => ({ ...row, moq: e.target.value }))} /></div>
            <label className="flex items-center gap-2 self-end h-10 text-sm text-slate-700"><input type="checkbox" checked={!!editing.exclusivity} onChange={(e) => setEditing((row) => ({ ...row, exclusivity: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" /> Exclusive partner listing</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveDetails} disabled={saving}>{saving ? 'Saving…' : 'Save Listing'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============== SUB-PAGE: AI/ML FORECASTING ===============
const FORECAST_HORIZONS = {
  short: { label: 'Short Term', range: '0–4 weeks', backtestWeeks: 4, method: 'XGBF' },
  mid: { label: 'Mid Term', range: '5–26 weeks', backtestWeeks: 13, method: 'MLRF' },
  long: { label: 'Long Term', range: '27–52 weeks', backtestWeeks: 26, method: 'STATISTICAL' },
}

function forecastSeriesKey(method) {
  return {
    XGBF: 'xgbf',
    MLRF: 'mlrf',
    STATISTICAL: 'statistical',
    NPI_CURVE: 'npiCurve',
    ANALOG_FORECAST: 'analogForecast',
    RAMP_DOWN: 'rampDown',
  }[method] || 'statistical'
}

function computeForecastMetrics(series, method) {
  if (!series.length) return { mape: 0, bias: 0, accuracy: 0 }
  const key = forecastSeriesKey(method)
  let absPct = 0
  let actualTotal = 0
  let forecastTotal = 0
  series.forEach((row) => {
    const actual = row.actual || 0
    const forecast = row[key] || 0
    if (actual) absPct += Math.abs(forecast - actual) / actual
    actualTotal += actual
    forecastTotal += forecast
  })
  const mape = (absPct / series.length) * 100
  const bias = actualTotal ? ((forecastTotal - actualTotal) / actualTotal) * 100 : 0
  return { mape, bias, accuracy: Math.max(0, 100 - mape) }
}

function ForecastIntelligencePanel({ weekly, distributors, skus, lifecycle }) {
  const [horizon, setHorizon] = useState('short')
  const [channel, setChannel] = useState('all')
  const [sku, setSku] = useState('all')

  const modelSeries = useMemo(() => {
    const filtered = weekly.filter((row) => (channel === 'all' || row.distributorId === channel) && (sku === 'all' || row.skuId === sku))
    const byWeek = new Map()
    filtered.forEach((row) => {
      if (!byWeek.has(row.weekId)) byWeek.set(row.weekId, { weekId: row.weekId, week: row.weekLabel, actual: 0, statistical: 0 })
      const bucket = byWeek.get(row.weekId)
      bucket.actual += row.tertiary || 0
      bucket.statistical += row.secondary || 0
    })
    return Array.from(byWeek.values()).sort((a, b) => a.weekId.localeCompare(b.weekId)).map((row, idx, rows) => {
      const progress = rows.length > 1 ? idx / (rows.length - 1) : 0
      return {
        ...row,
        mlrf: Math.round(row.actual * (0.985 + ((idx % 4) - 1.5) * 0.012)),
        xgbf: Math.round(row.actual * (1.005 + ((idx % 5) - 2) * 0.009)),
        npiCurve: Math.round(row.statistical * (0.62 + progress * 0.55)),
        analogForecast: Math.round(row.statistical * 1.08),
        rampDown: Math.round(row.statistical * (1 - progress * 0.22)),
      }
    })
  }, [weekly, channel, sku])

  const selectedLifecycle = lifecycle.find((row) => row.skuId === sku)
  const horizonMetrics = Object.entries(FORECAST_HORIZONS).map(([key, meta]) => {
    const sample = modelSeries.slice(-meta.backtestWeeks)
    const method = selectedLifecycle?.forecastMethods?.[key] || meta.method
    return { key, ...meta, method, ...computeForecastMetrics(sample, method) }
  })
  const selectedMeta = FORECAST_HORIZONS[horizon]
  const selectedMetrics = horizonMetrics.find((item) => item.key === horizon) || horizonMetrics[0]
  const appliedSeriesKey = forecastSeriesKey(selectedMetrics.method)
  const visibleSeries = modelSeries.slice(-selectedMeta.backtestWeeks).map((row) => ({ ...row, applied: row[appliedSeriesKey] }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-violet-600" />AI/ML Forecast Intelligence</h3>
          <p className="text-sm text-slate-500">Model-output comparison and rolling accuracy backtests; model training remains in the forecasting engine.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={horizon} onValueChange={setHorizon}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FORECAST_HORIZONS).map(([key, item]) => <SelectItem key={key} value={key}>{item.label} · {item.range}</SelectItem>)}</SelectContent></Select>
          <Select value={channel} onValueChange={setChannel}><SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Rolled-up network</SelectItem>{distributors.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
          <Select value={sku} onValueChange={setSku}><SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All products</SelectItem>{skus.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title={`${selectedMeta.label} MAPE`} value={`${selectedMetrics.mape.toFixed(1)}%`} subtitle={`${selectedMeta.backtestWeeks}-week rolling backtest`} icon={CircleGauge} accent={selectedMetrics.mape <= 10 ? 'green' : 'amber'} />
        <KpiCard title={`${selectedMeta.label} Bias`} value={`${selectedMetrics.bias >= 0 ? '+' : ''}${selectedMetrics.bias.toFixed(1)}%`} subtitle={selectedMetrics.bias > 0 ? 'Over-forecast' : 'Under-forecast'} icon={TrendingUp} accent={Math.abs(selectedMetrics.bias) <= 5 ? 'green' : 'amber'} />
        <KpiCard title="Applied Forecast Method" value={selectedMetrics.method} subtitle={`${selectedLifecycle ? `${selectedLifecycle.stage} lifecycle` : 'Portfolio default'} · ${selectedMeta.range}`} icon={BrainCircuit} accent="purple" />
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Forecast Accuracy by Horizon</CardTitle><CardDescription>Visible MAPE and bias governance across short, mid and long planning horizons.</CardDescription></CardHeader>
        <CardContent><DataTable columns={[{ key: 'label', label: 'Horizon' }, { key: 'range', label: 'Planning Range' }, { key: 'method', label: 'Recommended Method' }, { key: 'mape', label: 'MAPE' }, { key: 'bias', label: 'Bias' }, { key: 'accuracy', label: 'Accuracy' }]} rows={horizonMetrics} renderCell={(col, row) => {
          if (col.key === 'method') return <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-50">{row.method}</Badge>
          if (col.key === 'mape') return `${row.mape.toFixed(1)}%`
          if (col.key === 'bias') return `${row.bias >= 0 ? '+' : ''}${row.bias.toFixed(1)}%`
          if (col.key === 'accuracy') return <span className={row.accuracy >= 90 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>{row.accuracy.toFixed(1)}%</span>
          return row[col.key]
        }} /></CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Channel-Level Model Comparison</CardTitle><CardDescription>{channel === 'all' ? 'Rolled-up network' : distributors.find((item) => item.id === channel)?.name} · {sku === 'all' ? 'All products' : skus.find((item) => item.id === sku)?.name} · {selectedMeta.label} backtest window</CardDescription></CardHeader>
        <CardContent><ResponsiveContainer width="100%" height={310}><LineChart data={visibleSeries}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip /><Legend /><Line type="monotone" dataKey="actual" name="Actual" stroke="#0f172a" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="statistical" name="Statistical" stroke="#64748b" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="mlrf" name="MLRF" stroke="#8b5cf6" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="xgbf" name="XGBF" stroke="#2563eb" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="applied" name={`Applied (${selectedMetrics.method})`} stroke="#db2777" strokeWidth={2.5} strokeDasharray="5 4" dot={false} /></LineChart></ResponsiveContainer></CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Lifecycle-Aware Method Assignment</CardTitle><CardDescription>Product stage determines which forecast method is applied within each planning horizon.</CardDescription></CardHeader>
        <CardContent><DataTable columns={[{ key: 'skuName', label: 'Product' }, { key: 'stage', label: 'Lifecycle Stage' }, { key: 'short', label: 'Short Method' }, { key: 'mid', label: 'Mid Method' }, { key: 'long', label: 'Long Method' }]} rows={lifecycle} renderCell={(col, row) => {
          if (col.key === 'stage') return <Badge variant="secondary">{row.stage}</Badge>
          if (['short', 'mid', 'long'].includes(col.key)) return <span className="font-mono text-xs text-violet-700">{row.forecastMethods[col.key]}</span>
          return row[col.key]
        }} /></CardContent>
      </Card>
    </div>
  )
}

// =============== SUB-PAGE: NPI & PRODUCT LIFECYCLE ===============
function NpiLifecyclePanel({ npiForecasts, lifecycle, skus, onNpiUpdate, onLifecycleUpdate }) {
  const avgReadiness = npiForecasts.length ? Math.round(npiForecasts.reduce((sum, row) => sum + row.readinessPct, 0) / npiForecasts.length) : 0
  const growthCount = lifecycle.filter((row) => row.stage === 'GROWTH' || row.stage === 'LAUNCH').length
  const declineCount = lifecycle.filter((row) => row.stage === 'DECLINE' || row.stage === 'EOL').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="NPI Launches in Pipeline" value={npiForecasts.length.toString()} subtitle="Stage-aware launch curve forecasts" icon={Rocket} accent="purple" />
        <KpiCard title="Average NPI Readiness" value={`${avgReadiness}%`} subtitle="Listing, BOM, ODM and import readiness" icon={CheckCircle2} accent={avgReadiness >= 75 ? 'green' : 'amber'} />
        <KpiCard title="Lifecycle Attention" value={declineCount.toString()} subtitle={`${growthCount} launch/growth · ${declineCount} decline/EOL`} icon={Activity} accent={declineCount > 3 ? 'amber' : 'blue'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {npiForecasts.map((npi) => (
          <Card key={npi.npiId} className="border-violet-200/70 shadow-sm">
            <CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base flex items-center gap-2"><Rocket className="h-4 w-4 text-violet-600" />{npi.skuName}</CardTitle><CardDescription>{npi.skuId} · Launch {npi.launchWeek}</CardDescription></div><Badge className="bg-violet-50 text-violet-700 hover:bg-violet-50">{npi.readinessPct}% ready</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-slate-600">Launch Week</label><Input className="mt-1" defaultValue={npi.launchWeek} onBlur={(e) => onNpiUpdate(npi.npiId, { launchWeek: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Launch Curve</label><Select value={npi.curveTemplate} onValueChange={(value) => onNpiUpdate(npi.npiId, { curveTemplate: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{['S_CURVE', 'LINEAR', 'HOCKEY_STICK'].map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
                <div><label className="text-xs font-medium text-slate-600">Peak Weekly Units</label><Input className="mt-1" type="number" defaultValue={npi.peakWeeklyUnits} onBlur={(e) => onNpiUpdate(npi.npiId, { peakWeeklyUnits: Number(e.target.value) })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Analog Product</label><Select value={npi.analogSkuId} onValueChange={(value) => onNpiUpdate(npi.npiId, { analogSkuId: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{skus.map((sku) => <SelectItem key={sku.id} value={sku.id}>{sku.name}</SelectItem>)}</SelectContent></Select></div>
                <div><label className="text-xs font-medium text-slate-600">Cannibalization</label><Input className="mt-1" type="number" min="0" max="100" defaultValue={npi.cannibalizationRatePct} onBlur={(e) => onNpiUpdate(npi.npiId, { cannibalizationRatePct: Number(e.target.value) })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Readiness %</label><Input className="mt-1" type="number" min="0" max="100" defaultValue={npi.readinessPct} onBlur={(e) => onNpiUpdate(npi.npiId, { readinessPct: Number(e.target.value) })} /></div>
              </div>
              <ResponsiveContainer width="100%" height={180}><AreaChart data={npi.projection}><defs><linearGradient id={`npi-${npi.npiId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="week" tick={{ fontSize: 9, fill: '#64748b' }} interval={2} /><YAxis tick={{ fontSize: 10, fill: '#64748b' }} /><Tooltip /><Area type="monotone" dataKey="units" stroke="#8b5cf6" fill={`url(#npi-${npi.npiId})`} strokeWidth={2} /></AreaChart></ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Product Lifecycle Management</CardTitle><CardDescription>Stage tags immediately reassign the recommended forecast method for short, mid and long horizons.</CardDescription></CardHeader>
        <CardContent><DataTable columns={[{ key: 'skuName', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'stage', label: 'Lifecycle Stage' }, { key: 'short', label: 'Short' }, { key: 'mid', label: 'Mid' }, { key: 'long', label: 'Long' }, { key: 'stageSince', label: 'Stage Since' }]} rows={lifecycle} renderCell={(col, row) => {
          if (col.key === 'stage') return <Select value={row.stage} onValueChange={(value) => onLifecycleUpdate(row.skuId, value)}><SelectTrigger className="h-8 w-[125px]"><SelectValue /></SelectTrigger><SelectContent>{['NPI', 'LAUNCH', 'GROWTH', 'MATURITY', 'DECLINE', 'EOL'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          if (['short', 'mid', 'long'].includes(col.key)) return <Badge variant="secondary" className="font-mono text-[10px]">{row.forecastMethods[col.key]}</Badge>
          return row[col.key]
        }} /></CardContent>
      </Card>
    </div>
  )
}

// =============== SUB-PAGE: EVENT / PROMOTION CALENDAR ===============
function EventCalendarPanel({ events, weekly, weeks, skus, distributors, onCreate, onUpdate }) {
  const [open, setOpen] = useState(false)
  const emptyDraft = () => ({ eventName: '', eventType: 'PROMOTIONAL', startWeek: weeks[0]?.weekId || '', endWeek: weeks[0]?.weekId || '', upliftPercent: 20, status: 'PLANNED', skuId: 'all', channelId: 'all' })
  const [draft, setDraft] = useState(emptyDraft)

  const overlay = useMemo(() => {
    const byWeek = new Map()
    weekly.forEach((row) => {
      if (!byWeek.has(row.weekId)) byWeek.set(row.weekId, { weekId: row.weekId, week: row.weekLabel, baseline: 0, upliftUnits: 0 })
      byWeek.get(row.weekId).baseline += row.secondary || 0
    })
    events.filter((event) => event.status !== 'CANCELLED').forEach((event) => {
      weekly.forEach((row) => {
        if (row.weekId < event.startWeek || row.weekId > event.endWeek) return
        if (event.affectedSkus.length && !event.affectedSkus.includes(row.skuId)) return
        if (event.affectedChannels.length && !event.affectedChannels.includes(row.distributorId)) return
        const bucket = byWeek.get(row.weekId)
        if (bucket) bucket.upliftUnits += Math.round((row.secondary || 0) * event.upliftPercent / 100)
      })
    })
    return Array.from(byWeek.values()).sort((a, b) => a.weekId.localeCompare(b.weekId)).map((row) => ({ ...row, adjusted: row.baseline + row.upliftUnits }))
  }, [events, weekly])

  const createEvent = async () => {
    await onCreate({ ...draft, upliftPercent: Number(draft.upliftPercent), affectedSkus: draft.skuId === 'all' ? [] : [draft.skuId], affectedChannels: draft.channelId === 'all' ? [] : [draft.channelId] })
    setOpen(false)
    setDraft(emptyDraft())
  }

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-fuchsia-600" />Event & Promotion Calendar Engine</h3><p className="text-sm text-slate-500">Structured campaign records apply governed uplift overlays to the baseline forecast.</p></div><Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Create Event</Button></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><KpiCard title="Planned / Active Events" value={events.filter((e) => ['PLANNED', 'ACTIVE'].includes(e.status)).length.toString()} subtitle="Governed forecast drivers" icon={CalendarDays} accent="purple" /><KpiCard title="Peak Planned Uplift" value={`${Math.max(0, ...events.map((e) => e.upliftPercent))}%`} subtitle="Largest active event assumption" icon={TrendingUp} accent="amber" /><KpiCard title="Overlay Volume" value={`${Math.round(overlay.reduce((s, r) => s + r.upliftUnits, 0) / 1000)}K`} subtitle="Incremental units across visible horizon" icon={Sparkles} accent="blue" /></div>
    <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Baseline Forecast + Event Uplift Overlay</CardTitle><CardDescription>Only matching SKU, channel and week ranges receive each event's uplift.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><AreaChart data={overlay}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} /><YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip /><Legend /><Area type="monotone" dataKey="baseline" name="Baseline Forecast" stroke="#64748b" fill="#cbd5e1" fillOpacity={0.2} /><Area type="monotone" dataKey="adjusted" name="Event-Adjusted Forecast" stroke="#c026d3" fill="#e879f9" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></CardContent></Card>
    <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Managed Event Calendar</CardTitle><CardDescription>Persisted promotion assumptions used by Demand Factors.</CardDescription></CardHeader><CardContent><DataTable columns={[{ key: 'eventName', label: 'Event' }, { key: 'eventType', label: 'Type' }, { key: 'window', label: 'Week Range' }, { key: 'scope', label: 'Scope' }, { key: 'upliftPercent', label: 'Uplift' }, { key: 'status', label: 'Status' }, { key: 'accuracy', label: 'Post-event Accuracy' }]} rows={events} renderCell={(col, row) => {
      if (col.key === 'window') return `${row.startWeek} → ${row.endWeek}`
      if (col.key === 'scope') return <span className="text-xs">{row.affectedSkus.length ? `${row.affectedSkus.length} SKUs` : 'All SKUs'} · {row.affectedChannels.length ? `${row.affectedChannels.length} channels` : 'All channels'}</span>
      if (col.key === 'upliftPercent') return <Input className="h-8 w-20" type="number" defaultValue={row.upliftPercent} onBlur={(e) => onUpdate(row.eventId, { upliftPercent: Number(e.target.value) })} />
      if (col.key === 'status') return <Select value={row.status} onValueChange={(value) => onUpdate(row.eventId, { status: value })}><SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      if (col.key === 'accuracy') return row.actualUpliftPercent == null ? '—' : `${Math.max(0, 100 - Math.abs(row.actualUpliftPercent - row.upliftPercent)).toFixed(0)}%`
      return row[col.key]
    }} /></CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create Demand Event</DialogTitle><DialogDescription>Add a governed uplift overlay to the baseline forecast.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-4 py-2"><div className="col-span-2"><label className="text-xs font-medium">Event Name</label><Input className="mt-1" value={draft.eventName} onChange={(e) => setDraft((d) => ({ ...d, eventName: e.target.value }))} /></div><div><label className="text-xs font-medium">Event Type</label><Select value={draft.eventType} onValueChange={(value) => setDraft((d) => ({ ...d, eventType: value }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{['FESTIVAL', 'PROMOTIONAL', 'TRADE_CAMPAIGN', 'MEDIA_BURST', 'CLEARANCE'].map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium">Uplift %</label><Input className="mt-1" type="number" value={draft.upliftPercent} onChange={(e) => setDraft((d) => ({ ...d, upliftPercent: e.target.value }))} /></div><div><label className="text-xs font-medium">Start Week</label><Select value={draft.startWeek} onValueChange={(value) => setDraft((d) => ({ ...d, startWeek: value }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{weeks.map((w) => <SelectItem key={w.weekId} value={w.weekId}>{w.label}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium">End Week</label><Select value={draft.endWeek} onValueChange={(value) => setDraft((d) => ({ ...d, endWeek: value }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{weeks.map((w) => <SelectItem key={w.weekId} value={w.weekId}>{w.label}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium">Product Scope</label><Select value={draft.skuId} onValueChange={(value) => setDraft((d) => ({ ...d, skuId: value }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All products</SelectItem>{skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div><div><label className="text-xs font-medium">Channel Scope</label><Select value={draft.channelId} onValueChange={(value) => setDraft((d) => ({ ...d, channelId: value }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All channels</SelectItem>{distributors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={createEvent} disabled={!draft.eventName}>Create Event</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

// =============== SUB-PAGE: CHANNEL INVENTORY NORMS ===============
function InventoryNormsPanel({ norms, distributors, onUpdate }) {
  const [channel, setChannel] = useState('all')
  const visible = channel === 'all' ? norms : norms.filter((row) => row.distributorId === channel)
  const healthy = visible.filter((row) => row.normStatus === 'HEALTHY').length
  const adherence = visible.length ? Math.round(healthy / visible.length * 100) : 0
  const overrides = visible.filter((row) => row.overrideDos != null).length
  return <div className="space-y-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Channel Inventory Norms</h3><p className="text-sm text-slate-500">System-suggested DOS targets with controlled planner overrides by SKU × channel.</p></div><Select value={channel} onValueChange={setChannel}><SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All channel partners</SelectItem>{distributors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><KpiCard title="Norm Adherence" value={`${adherence}%`} subtitle={`${healthy} of ${visible.length} within target band`} icon={Target} accent={adherence >= 75 ? 'green' : 'amber'} /><KpiCard title="Planner Overrides" value={overrides.toString()} subtitle="Overrides retain reason and owner" icon={FileEdit} accent="blue" /><KpiCard title="Critical / Overstock" value={visible.filter((r) => ['CRITICAL', 'OVERSTOCK'].includes(r.normStatus)).length.toString()} subtitle="Exceptions requiring inventory action" icon={AlertTriangle} accent="rose" /></div>
    <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Suggested and Effective DOS Norms</CardTitle><CardDescription>Suggested norms use demand variability, partner tier and service target; overrides become the effective planning norm.</CardDescription></CardHeader><CardContent><DataTable columns={[{ key: 'skuName', label: 'Product' }, { key: 'distributorName', label: 'Channel Partner' }, { key: 'suggestedDos', label: 'Suggested DOS' }, { key: 'overrideDos', label: 'Planner Override' }, { key: 'effectiveDos', label: 'Effective DOS' }, { key: 'actualDos', label: 'Actual DOS' }, { key: 'band', label: 'Min / Max' }, { key: 'normStatus', label: 'Status' }]} rows={visible.slice(0, 40)} renderCell={(col, row) => {
      if (col.key === 'suggestedDos' || col.key === 'effectiveDos' || col.key === 'actualDos') return `${row[col.key]}d`
      if (col.key === 'overrideDos') return <Input className="h-8 w-20" type="number" placeholder="Auto" defaultValue={row.overrideDos ?? ''} onBlur={(e) => onUpdate(row.normId, e.target.value === '' ? null : Number(e.target.value), 'Planner override from Channel Inventory Norms')} />
      if (col.key === 'band') return `${row.minDos}d / ${row.maxDos}d`
      if (col.key === 'normStatus') return <Badge className={row.normStatus === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : row.normStatus === 'WATCH' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : 'bg-rose-50 text-rose-700 hover:bg-rose-50'}>{row.normStatus}</Badge>
      return row[col.key]
    }} /></CardContent></Card>
  </div>
}

// =============== SUB-PAGE: ROLE-BASED DEMAND CONSENSUS ===============
const CONSENSUS_ROLE_ORDER = ['Category Manager', 'Sales Head', 'S&OP Lead', 'Finance']

function DemandConsensusPanel({ workflows, onAction }) {
  const [role, setRole] = useState(CONSENSUS_ROLE_ORDER[0])
  const [drafts, setDrafts] = useState({})
  const locked = workflows.filter((row) => row.status === 'LOCKED').length
  const compliance = workflows.length ? Math.round(locked / workflows.length * 100) : 0
  const auditRows = workflows.flatMap((row) => (row.auditTrail || []).map((audit) => ({ ...audit, workflowId: row.workflowId, skuName: row.skuName }))).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20)
  const draftFor = (row) => drafts[row.workflowId] || { value: row.proposedConsensusFcst, reason: '' }
  const setDraft = (row, changes) => setDrafts((all) => ({ ...all, [row.workflowId]: { ...draftFor(row), ...changes } }))

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Role-Based Demand Consensus</h3><p className="text-sm text-slate-500">Category → Sales → S&OP → Finance; Finance approval locks the consensus forecast.</p></div><Select value={role} onValueChange={setRole}><SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger><SelectContent>{CONSENSUS_ROLE_ORDER.map((item) => <SelectItem key={item} value={item}>Acting as {item}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><KpiCard title="Consensus Compliance" value={`${compliance}%`} subtitle={`${locked} of ${workflows.length} forecasts locked`} icon={CheckCircle2} accent={compliance >= 80 ? 'green' : 'amber'} /><KpiCard title="Awaiting Action" value={workflows.filter((row) => row.status !== 'LOCKED').length.toString()} subtitle={`Current role: ${role}`} icon={Clock} accent="blue" /><KpiCard title="Audited Decisions" value={workflows.reduce((sum, row) => sum + (row.auditTrail?.length || 0), 0).toString()} subtitle="Overrides and workflow actions" icon={FileEdit} accent="purple" /></div>
    <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Consensus Workflow Queue</CardTitle><CardDescription>Every override requires a reason and is appended to the immutable in-process audit trail.</CardDescription></CardHeader><CardContent className="space-y-4">{workflows.map((row) => {
      const draft = draftFor(row)
      const canAct = row.status !== 'LOCKED' && row.currentStepOwner === role
      const variance = row.statisticalFcst ? ((row.proposedConsensusFcst - row.statisticalFcst) / row.statisticalFcst) * 100 : 0
      return <div key={row.workflowId} className="rounded-lg border border-slate-200 p-4 space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{row.skuName}</p><p className="text-xs text-slate-500">{row.planningWeek} · {row.horizonType}</p></div><div className="text-right"><Badge className={row.status === 'LOCKED' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-blue-50 text-blue-700 hover:bg-blue-50'}>{row.status.replaceAll('_', ' ')}</Badge><p className="text-[10px] text-slate-500 mt-1">Owner: {row.currentStepOwner || 'Locked'}</p></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"><div><p className="text-xs text-slate-500">Statistical</p><p className="font-medium">{row.statisticalFcst.toLocaleString()}</p></div><div><p className="text-xs text-slate-500">Channel submitted</p><p className="font-medium">{row.channelSubmittedFcst.toLocaleString()}</p></div><div><p className="text-xs text-slate-500">Proposed consensus</p><p className="font-medium">{row.proposedConsensusFcst.toLocaleString()} <span className={Math.abs(variance) > 10 ? 'text-rose-600' : 'text-slate-500'}>({variance >= 0 ? '+' : ''}{variance.toFixed(1)}%)</span></p></div><div><p className="text-xs text-slate-500">Progress</p><p className="text-xs">{CONSENSUS_ROLE_ORDER.map((item) => item === row.currentStepOwner ? `[${item}]` : item).join(' → ')}</p></div></div>{row.status !== 'LOCKED' && <div className="grid grid-cols-1 md:grid-cols-[150px_1fr_auto_auto_auto] gap-2"><Input type="number" value={draft.value} onChange={(e) => setDraft(row, { value: e.target.value })} disabled={!canAct} /><Input placeholder="Required override/rejection reason" value={draft.reason} onChange={(e) => setDraft(row, { reason: e.target.value })} disabled={!canAct} /><Button variant="outline" disabled={!canAct || !draft.reason} onClick={() => onAction(row.workflowId, 'override', { proposedConsensusFcst: Number(draft.value), reason: draft.reason, actorRole: role })}>Override</Button><Button disabled={!canAct} onClick={() => onAction(row.workflowId, 'approve', { reason: draft.reason || 'Approved', actorRole: role })}>Approve</Button><Button variant="destructive" disabled={!canAct || !draft.reason} onClick={() => onAction(row.workflowId, 'reject', { reason: draft.reason, actorRole: role })}>Reject</Button></div>}</div>
    })}</CardContent></Card>
    <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Consensus Audit Trail</CardTitle><CardDescription>Most recent overrides, approvals, rejections and locks.</CardDescription></CardHeader><CardContent><DataTable columns={[{ key: 'at', label: 'Timestamp' }, { key: 'skuName', label: 'Product' }, { key: 'action', label: 'Action' }, { key: 'actorRole', label: 'Role' }, { key: 'change', label: 'Value Change' }, { key: 'reason', label: 'Reason' }]} rows={auditRows} renderCell={(col, row) => { if (col.key === 'at') return new Date(row.at).toLocaleString(); if (col.key === 'change') return `${row.oldValue ?? '—'} → ${row.newValue ?? '—'}`; return row[col.key] }} /></CardContent></Card>
  </div>
}

// =============== SUB-PAGE: DEMAND PLANNING KPI DASHBOARD ===============
function DemandPlanningKpiDashboard({ weekly, events, norms, workflows, npiForecasts, integrations }) {
  const actual = weekly.reduce((sum, row) => sum + (row.tertiary || 0), 0)
  const forecast = weekly.reduce((sum, row) => sum + (row.secondary || 0), 0)
  const valid = weekly.filter((row) => row.tertiary)
  const mape = valid.length ? valid.reduce((sum, row) => sum + Math.abs((row.secondary || 0) - row.tertiary) / row.tertiary, 0) / valid.length * 100 : 0
  const bias = actual ? (forecast - actual) / actual * 100 : 0
  const pct = (part, total) => total ? Math.round(part / total * 100) : 0
  const consensusCompliance = pct(workflows.filter((row) => row.status === 'LOCKED').length, workflows.length)
  const normAdherence = pct(norms.filter((row) => row.normStatus === 'HEALTHY').length, norms.length)
  const npiReadiness = npiForecasts.length ? Math.round(npiForecasts.reduce((sum, row) => sum + row.readinessPct, 0) / npiForecasts.length) : 0
  const completedEvents = events.filter((row) => row.actualUpliftPercent != null)
  const eventAccuracy = completedEvents.length ? Math.round(completedEvents.reduce((sum, row) => sum + Math.max(0, 100 - Math.abs(row.actualUpliftPercent - row.upliftPercent)), 0) / completedEvents.length) : 0
  const channelFreshness = pct(integrations.filter((row) => row.healthStatus === 'HEALTHY').length, integrations.length)
  const chartRows = [{ metric: 'Forecast accuracy', value: Math.max(0, 100 - mape) }, { metric: 'Consensus compliance', value: consensusCompliance }, { metric: 'Norm adherence', value: normAdherence }, { metric: 'NPI readiness', value: npiReadiness }, { metric: 'Event accuracy', value: eventAccuracy }, { metric: 'Channel freshness', value: channelFreshness }]
  return <div className="space-y-6"><div><h3 className="text-lg font-semibold text-slate-900">Demand Planning KPI Dashboard</h3><p className="text-sm text-slate-500">Executive close-out view across forecast quality, governance, inventory norms, events and channel data.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><KpiCard title="Forecast MAPE" value={`${mape.toFixed(1)}%`} subtitle={`Bias ${bias >= 0 ? '+' : ''}${bias.toFixed(1)}%`} icon={CircleGauge} accent={mape <= 10 ? 'green' : 'amber'} /><KpiCard title="Consensus Compliance" value={`${consensusCompliance}%`} subtitle="Locked demand workflows" icon={CheckCircle2} accent="blue" /><KpiCard title="Inventory Norm Adherence" value={`${normAdherence}%`} subtitle="Actual DOS within norm band" icon={Target} accent="green" /><KpiCard title="NPI Readiness" value={`${npiReadiness}%`} subtitle="Average launch readiness" icon={Rocket} accent="purple" /><KpiCard title="Event Uplift Accuracy" value={`${eventAccuracy}%`} subtitle={`${completedEvents.length} completed event(s)`} icon={CalendarDays} accent="amber" /><KpiCard title="Channel Data Freshness" value={`${channelFreshness}%`} subtitle="Feeds within cadence SLA" icon={Database} accent="blue" /></div><Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Demand Planning Health Scorecard</CardTitle><CardDescription>Comparable percentage view of the principal planning KPIs.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={320}><BarChart data={chartRows} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} /><YAxis type="category" dataKey="metric" width={145} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} /><Bar dataKey="value" fill="#2563eb" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></CardContent></Card></div>
}

// =============== PAGE: DEMAND PLANNING ===============
// Concepts:
//   • Actual demand   = tertiary (consumer sell-out, what really sold)
//   • Forecast        = secondary (the plan / consensus forecast)
//   • Adjusted        = Forecast × (1 + adj%)   (planner override)
//   • Accuracy (MAPE) = 100 − mean(|forecast − actual| / actual × 100)
//   • Growth          = (recent half actual − earlier half actual) / earlier half
function DemandPage({ data, activeRole = 'S&OP' }) {
  const allowSection = (section) => canAccessDemandSection(activeRole, section)
  const [region, setRegion] = useState('all')
  const [skuFilter, setSkuFilter] = useState('all')
  const [adj, setAdj] = useState([0]) // forecast adjustment % (−30 to +30)
  const adjPct = adj[0]
  const adjMult = 1 + adjPct / 100

  const [listingRows, setListingRows] = useState([])
  const [integrationRows, setIntegrationRows] = useState([])
  const [lifecycleRows, setLifecycleRows] = useState([])
  const [npiForecasts, setNpiForecasts] = useState([])
  const [eventRows, setEventRows] = useState([])
  const [inventoryNormRows, setInventoryNormRows] = useState([])
  const [consensusRows, setConsensusRows] = useState([])
  const [mastersLoading, setMastersLoading] = useState(true)
  const [mastersError, setMastersError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadDemandMasters() {
      try {
        setMastersLoading(true)
        const [integrationRes, listingsRes, lifecycleRes, npiRes, eventsRes, normsRes, consensusRes] = await Promise.all([
          fetch('/api/demand/channel-integrations'),
          fetch('/api/demand/listings'),
          fetch('/api/demand/lifecycle'),
          fetch('/api/demand/npi-forecasts'),
          fetch('/api/demand/events'),
          fetch('/api/demand/inventory-norms'),
          fetch('/api/demand/consensus-workflows'),
        ])
        const [integrationJson, listingsJson, lifecycleJson, npiJson, eventsJson, normsJson, consensusJson] = await Promise.all([integrationRes.json(), listingsRes.json(), lifecycleRes.json(), npiRes.json(), eventsRes.json(), normsRes.json(), consensusRes.json()])
        if (!integrationRes.ok || !listingsRes.ok || !lifecycleRes.ok || !npiRes.ok || !eventsRes.ok || !normsRes.ok || !consensusRes.ok) throw new Error(integrationJson.error || listingsJson.error || lifecycleJson.error || npiJson.error || eventsJson.error || normsJson.error || consensusJson.error || 'Failed to load demand planning masters')
        if (!cancelled) {
          setIntegrationRows(integrationJson.rows || [])
          setListingRows(listingsJson.rows || [])
          setLifecycleRows(lifecycleJson.rows || [])
          setNpiForecasts(npiJson.rows || [])
          setEventRows(eventsJson.rows || [])
          setInventoryNormRows(normsJson.rows || [])
          setConsensusRows(consensusJson.rows || [])
          setMastersError(null)
        }
      } catch (error) {
        if (!cancelled) setMastersError(error.message)
      } finally {
        if (!cancelled) setMastersLoading(false)
      }
    }
    loadDemandMasters()
    return () => { cancelled = true }
  }, [])

  const handleListingChange = useCallback(async (listingId, changes) => {
    const response = await fetch('/api/demand/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, ...changes }),
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update listing')
    setListingRows((rows) => rows.map((row) => row.listingId === listingId ? json.row : row))
    return json.row
  }, [])

  const handleIntegrationChange = useCallback(async (distributorId, changes) => {
    const response = await fetch('/api/demand/channel-integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributorId, ...changes }),
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update channel integration')
    setIntegrationRows((rows) => rows.map((row) => row.distributorId === distributorId ? json.row : row))
  }, [])

  const handleFeedReceived = useCallback(async (distributorId) => {
    await handleIntegrationChange(distributorId, { action: 'mark_received' })
  }, [handleIntegrationChange])

  const handleLifecycleChange = useCallback(async (skuId, stage) => {
    const response = await fetch('/api/demand/lifecycle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skuId, stage }),
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update lifecycle stage')
    setLifecycleRows((rows) => rows.map((row) => row.skuId === skuId ? json.row : row))
  }, [])

  const handleNpiChange = useCallback(async (npiId, changes) => {
    const response = await fetch('/api/demand/npi-forecasts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ npiId, ...changes }),
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update NPI forecast')
    setNpiForecasts((rows) => rows.map((row) => row.npiId === npiId ? json.row : row))
  }, [])

  const handleEventCreate = useCallback(async (event) => {
    const response = await fetch('/api/demand/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not create demand event')
    setEventRows((rows) => [...rows, json.row])
  }, [])

  const handleEventUpdate = useCallback(async (eventId, changes) => {
    const response = await fetch('/api/demand/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, ...changes }) })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update demand event')
    setEventRows((rows) => rows.map((row) => row.eventId === eventId ? json.row : row))
  }, [])

  const handleNormUpdate = useCallback(async (normId, overrideDos, overrideReason) => {
    const response = await fetch('/api/demand/inventory-norms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ normId, overrideDos, overrideReason }) })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update inventory norm')
    setInventoryNormRows((rows) => rows.map((row) => row.normId === normId ? json.row : row))
  }, [])

  const handleConsensusAction = useCallback(async (workflowId, action, changes) => {
    const response = await fetch('/api/demand/consensus-workflows', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId, action, ...changes }) })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Could not update consensus workflow')
    setConsensusRows((rows) => rows.map((row) => row.workflowId === workflowId ? json.row : row))
  }, [])

  // Filter rows by region + SKU once
  const rows = useMemo(() => {
    return (data.weekly || []).filter((r) => {
      if (region !== 'all' && r.region !== region) return false
      if (skuFilter !== 'all' && r.skuId !== skuFilter) return false
      return true
    })
  }, [data.weekly, region, skuFilter])

  const weeklySeries = useMemo(() => {
    const byWeek = new Map()
    for (const r of rows) {
      if (!byWeek.has(r.weekId)) byWeek.set(r.weekId, { label: r.weekLabel, actual: 0, forecast: 0 })
      byWeek.get(r.weekId).actual += Number(r.tertiary || 0)
      byWeek.get(r.weekId).forecast += Number(r.secondary || 0)
    }
    const arr = Array.from(byWeek.entries()).sort(([a], [b]) => (a > b ? 1 : -1))
    return arr.map(([, v]) => {
      const actual = Math.round(v.actual / 1000)
      const forecast = Math.round(v.forecast / 1000)
      return {
        w: v.label,
        actual,
        forecast,
        adjusted: Math.round(forecast * adjMult),
      }
    })
  }, [rows, adjMult])

  // SKU-level aggregations incl. growth, accuracy, weekly mini trend
  const skuDetail = useMemo(() => {
    const byKey = new Map()
    for (const r of rows) {
      if (!byKey.has(r.skuId)) {
        byKey.set(r.skuId, { name: r.skuName, category: r.category, actual: 0, forecast: 0, wk: [] })
      }
      const e = byKey.get(r.skuId)
      e.actual += r.tertiary
      e.forecast += r.secondary
      e.wk.push({ weekId: r.weekId, weekLabel: r.weekLabel, actual: r.tertiary, forecast: r.secondary })
    }
    return Array.from(byKey.entries()).map(([id, e]) => {
      // Sort weekly rows chronologically
      e.wk.sort((a, b) => (a.weekId > b.weekId ? 1 : -1))
      // Aggregate by weekId across distributors (filtered set)
      const weekAgg = new Map()
      for (const w of e.wk) {
        if (!weekAgg.has(w.weekId)) weekAgg.set(w.weekId, { weekLabel: w.weekLabel, actual: 0, forecast: 0 })
        const g = weekAgg.get(w.weekId)
        g.actual += w.actual
        g.forecast += w.forecast
      }
      const weekly = Array.from(weekAgg.values())

      // Growth = second half vs first half (actual/tertiary)
      const half = Math.floor(weekly.length / 2) || 1
      const earlier = weekly.slice(0, half).reduce((s, w) => s + w.actual, 0)
      const recent = weekly.slice(half).reduce((s, w) => s + w.actual, 0)
      const growth = earlier ? ((recent - earlier) / earlier) * 100 : 0

      // MAPE-style accuracy per week then averaged
      const mape = weekly.reduce((s, w) => s + (w.actual ? Math.abs(w.forecast - w.actual) / w.actual : 0), 0)
      const accuracy = Math.max(50, Math.min(99, Math.round(100 - (mape / weekly.length) * 100)))

      const adjustedForecast = Math.round(e.forecast * adjMult)
      return {
        sku: id,
        name: e.name,
        category: e.category,
        actual: e.actual,
        forecast: e.forecast,
        adjusted: adjustedForecast,
        accuracy,
        growth,
        trend: growth > 2 ? '↗' : growth < -2 ? '↘' : '→',
        sparkline: weekly.map((w) => ({ w: w.weekLabel, a: w.actual, f: w.forecast })),
      }
    }).sort((a, b) => b.actual - a.actual)
  }, [rows, adjMult])

  // KPIs
  const totalActual = skuDetail.reduce((s, r) => s + r.actual, 0)
  const totalForecast = skuDetail.reduce((s, r) => s + r.forecast, 0)
  const totalAdjusted = skuDetail.reduce((s, r) => s + r.adjusted, 0)
  const meanAcc = skuDetail.length ? Math.round(skuDetail.reduce((s, r) => s + r.accuracy, 0) / skuDetail.length) : 0
  const avgGrowth = skuDetail.length ? skuDetail.reduce((s, r) => s + r.growth, 0) / skuDetail.length : 0
  const bias = totalActual ? ((totalForecast - totalActual) / totalActual) * 100 : 0

  return (
    <div>
      <SectionHeader
        title="Demand Planning"
        description={`Forecast planning for ${skuDetail.length} SKU${skuDetail.length !== 1 ? 's' : ''} · ${region === 'all' ? 'all regions' : region}`}
        actions={
          <>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {(data.regions || []).map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={skuFilter} onValueChange={setSkuFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SKUs</SelectItem>
                {(data.skus || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.id} · {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2" onClick={() => setAdj([0])}>
              <Sparkles className="h-4 w-4" />Reset
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 h-auto flex flex-wrap justify-start">
          {allowSection('overview') && <TabsTrigger value="overview">Forecast Overview</TabsTrigger>}
          {allowSection('intelligence') && <TabsTrigger value="ai-ml">AI/ML Forecasting</TabsTrigger>}
          {allowSection('npi-lifecycle') && <TabsTrigger value="npi-lifecycle">NPI & Lifecycle</TabsTrigger>}
          {allowSection('events') && <TabsTrigger value="events">Event & Promotion Calendar</TabsTrigger>}
          {allowSection('norms') && <TabsTrigger value="inventory-norms">Channel Inventory Norms</TabsTrigger>}
          {allowSection('consensus') && <TabsTrigger value="consensus">Consensus Workflow</TabsTrigger>}
          {allowSection('integration') && <TabsTrigger value="channel-integration">Channel Partner Data Integration</TabsTrigger>}
          {allowSection('listings') && <TabsTrigger value="listing-master">Product/Partner Listing Master</TabsTrigger>}
          {allowSection('kpis') && <TabsTrigger value="kpi-dashboard">KPI Dashboard</TabsTrigger>}
        </TabsList>

        {allowSection('overview') && <TabsContent value="overview" className="mt-0">
          {/* ---------- KPI ROW ---------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Total Demand (Actual)"
              value={`${fmtNum(totalActual / 1000)}K units`}
              subtitle={`${data.meta?.weekCount || 0}w window`}
              icon={Package}
              accent="blue"
            />
            <KpiCard
              title="Total Forecast"
              value={`${fmtNum(totalForecast / 1000)}K units`}
              change={adjPct !== 0 ? `Adjusted: ${fmtNum(totalAdjusted / 1000)}K` : undefined}
              trend={adjPct >= 0 ? 'up' : 'down'}
              subtitle={adjPct !== 0 ? `${adjPct > 0 ? '+' : ''}${adjPct}% lift applied` : 'baseline'}
              icon={TrendingUp}
              accent="green"
            />
            <KpiCard
              title="Forecast Accuracy"
              value={`${meanAcc}%`}
              subtitle={`bias ${bias >= 0 ? '+' : ''}${bias.toFixed(1)}%`}
              trend={meanAcc >= 85 ? 'up' : 'down'}
              change={meanAcc >= 90 ? 'Healthy' : meanAcc >= 80 ? 'Acceptable' : 'Needs review'}
              icon={GitBranch}
              accent={meanAcc >= 90 ? 'green' : meanAcc >= 80 ? 'amber' : 'rose'}
            />
            <KpiCard
              title="Growth Trend"
              value={`${avgGrowth >= 0 ? '+' : ''}${avgGrowth.toFixed(1)}%`}
              trend={avgGrowth >= 0 ? 'up' : 'down'}
              subtitle="avg across SKUs"
              change="half-vs-half"
              icon={avgGrowth >= 0 ? ArrowUpRight : ArrowDownRight}
              accent={avgGrowth >= 0 ? 'purple' : 'rose'}
            />
          </div>

          {/* ---------- ADJUSTMENT SLIDER ---------- */}
          <Card className="border-slate-200/70 shadow-sm mb-6">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Forecast Adjustment
                  </CardTitle>
                  <CardDescription>Apply a percentage lift/cut to the baseline forecast for sensitivity analysis</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Lift</span>
                  <div className={`text-2xl font-semibold min-w-[80px] text-right ${adjPct > 0 ? 'text-emerald-600' : adjPct < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {adjPct > 0 ? '+' : ''}{adjPct}%
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Slider value={adj} onValueChange={setAdj} min={-30} max={30} step={1} />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>-30%</span>
                <span>-15%</span>
                <span className="text-slate-700 font-medium">baseline</span>
                <span>+15%</span>
                <span>+30%</span>
              </div>
              {adjPct !== 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                    Δ {fmtNum(Math.abs(totalAdjusted - totalForecast) / 1000)}K units
                  </Badge>
                  <span>
                    {adjPct > 0 ? 'Forecast lifted by' : 'Forecast reduced by'} {Math.abs(adjPct)}% — flows into the chart and table below.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---------- CHART: ACTUAL VS FORECAST ---------- */}
          <Card className="border-slate-200/70 shadow-sm mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Actual vs Forecast</CardTitle>
                  <CardDescription>Weekly demand · 000 units · {skuFilter === 'all' ? 'all SKUs' : skuFilter}</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Actual</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Forecast</span>
                  {adjPct !== 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Adjusted</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={weeklySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="basis" dataKey="actual" stroke="#10b981" strokeWidth={2.5} dot={false} name="Actual" />
                  <Line type="basis" dataKey="forecast" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Forecast" />
                  {adjPct !== 0 && (
                    <Line type="basis" dataKey="adjusted" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 4" dot={false} name="Adjusted" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ---------- SKU DETAIL TABLE ---------- */}
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Forecast Detail by SKU</CardTitle>
                  <CardDescription>{skuDetail.length} SKU{skuDetail.length !== 1 ? 's' : ''} · {data.meta?.weekCount || 0}-week actuals vs forecast · adjusted column reflects slider</CardDescription>
                </div>
                {adjPct !== 0 && (
                  <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-50">
                    {adjPct > 0 ? '+' : ''}{adjPct}% lift active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'sku', label: 'SKU' },
                  { key: 'name', label: 'Product' },
                  { key: 'category', label: 'Category' },
                  { key: 'actual', label: 'Actual' },
                  { key: 'forecast', label: 'Forecast' },
                  { key: 'adjusted', label: 'Adjusted' },
                  { key: 'spark', label: 'Trend' },
                  { key: 'accuracy', label: 'Accuracy' },
                  { key: 'growth', label: 'Growth' },
                ]}
                rows={skuDetail}
                renderCell={(col, row) => {
                  if (col.key === 'sku') return <span className="font-mono text-xs text-slate-700">{row.sku}</span>
                  if (col.key === 'actual') return <span className="font-medium">{fmtNum(row.actual)}</span>
                  if (col.key === 'forecast') return fmtNum(row.forecast)
                  if (col.key === 'adjusted') {
                    const delta = row.adjusted - row.forecast
                    return (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmtNum(row.adjusted)}</span>
                        {adjPct !== 0 && (
                          <span className={`text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {delta >= 0 ? '+' : ''}{fmtNum(delta)}
                          </span>
                        )}
                      </div>
                    )
                  }
                  if (col.key === 'spark') {
                    return (
                      <div className="w-24 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={row.sparkline}>
                            <Line type="monotone" dataKey="a" stroke="#10b981" strokeWidth={1.5} dot={false} />
                            <Line type="monotone" dataKey="f" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  }
                  if (col.key === 'accuracy') {
                    const color = row.accuracy >= 90 ? 'bg-emerald-500' : row.accuracy >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                    return (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${row.accuracy}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 font-medium w-8">{row.accuracy}%</span>
                      </div>
                    )
                  }
                  if (col.key === 'growth') {
                    const color = row.growth > 2 ? 'text-emerald-600' : row.growth < -2 ? 'text-rose-600' : 'text-slate-500'
                    const Icon = row.growth > 2 ? ArrowUpRight : row.growth < -2 ? ArrowDownRight : null
                    return (
                      <span className={`font-medium flex items-center gap-1 ${color}`}>
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {row.growth >= 0 ? '+' : ''}{row.growth.toFixed(1)}%
                      </span>
                    )
                  }
                  return row[col.key]
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>}

        {allowSection('intelligence') && <TabsContent value="ai-ml" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading forecast intelligence…</CardContent></Card> : <ForecastIntelligencePanel weekly={data.weekly || []} distributors={data.distributors || []} skus={data.skus || []} lifecycle={lifecycleRows} />}
        </TabsContent>}

        {allowSection('npi-lifecycle') && <TabsContent value="npi-lifecycle" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading NPI and lifecycle plans…</CardContent></Card> : <NpiLifecyclePanel npiForecasts={npiForecasts} lifecycle={lifecycleRows} skus={data.skus || []} onNpiUpdate={handleNpiChange} onLifecycleUpdate={handleLifecycleChange} />}
        </TabsContent>}

        {allowSection('events') && <TabsContent value="events" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading event calendar…</CardContent></Card> : <EventCalendarPanel events={eventRows} weekly={data.weekly || []} weeks={data.weeks || []} skus={data.skus || []} distributors={data.distributors || []} onCreate={handleEventCreate} onUpdate={handleEventUpdate} />}
        </TabsContent>}

        {allowSection('norms') && <TabsContent value="inventory-norms" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading channel inventory norms…</CardContent></Card> : <InventoryNormsPanel norms={inventoryNormRows} distributors={data.distributors || []} onUpdate={handleNormUpdate} />}
        </TabsContent>}

        {allowSection('consensus') && <TabsContent value="consensus" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading consensus workflows…</CardContent></Card> : <DemandConsensusPanel workflows={consensusRows} onAction={handleConsensusAction} />}
        </TabsContent>}

        {allowSection('integration') && <TabsContent value="channel-integration" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : <ChannelPartnerIntegrationPanel rows={integrationRows} onUpdate={handleIntegrationChange} onMarkReceived={handleFeedReceived} loading={mastersLoading} />}
        </TabsContent>}

        {allowSection('listings') && <TabsContent value="listing-master" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading product/partner listing master…</CardContent></Card> : <ListingMasterPanel
            skus={data.skus || []}
            distributors={data.distributors || []}
            listingRows={listingRows}
            onChangeStatus={handleListingChange}
          />}
        </TabsContent>}

        {allowSection('kpis') && <TabsContent value="kpi-dashboard" className="mt-0">
          {mastersError ? <Card><CardContent className="p-8 text-sm text-rose-600">{mastersError}</CardContent></Card> : mastersLoading ? <Card><CardContent className="p-10 text-sm text-slate-500 text-center">Loading demand planning KPIs…</CardContent></Card> : <DemandPlanningKpiDashboard weekly={data.weekly || []} events={eventRows} norms={inventoryNormRows} workflows={consensusRows} npiForecasts={npiForecasts} integrations={integrationRows} />}
        </TabsContent>}
      </Tabs>
    </div>
  )
}

// =============== PAGE: DISTRIBUTOR ORDERS ===============
// ---- Helpers shared by OrdersPage + OrderEditDialog --------------------
const LOCK_STYLES = {
  editable: { icon: Unlock, chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconCls: 'text-emerald-600' },
  restricted: { icon: ShieldAlert, chip: 'bg-amber-50 text-amber-700 border-amber-200', iconCls: 'text-amber-600' },
  locked: { icon: Lock, chip: 'bg-rose-50 text-rose-700 border-rose-200', iconCls: 'text-rose-600' },
}
const STATUS_STYLES = {
  Pending: 'bg-slate-100 text-slate-700',
  Amended: 'bg-blue-50 text-blue-700',
  'Pending Approval': 'bg-violet-50 text-violet-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Locked: 'bg-rose-50 text-rose-700',
}

const EXECUTION_STATUS_STYLES = {
  'Fully fulfilled': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
  Partial: 'bg-amber-50 text-amber-700 hover:bg-amber-50',
  Pending: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
}
const LockBadge = ({ lockState, size = 'sm' }) => {
  if (!lockState) return null
  const s = LOCK_STYLES[lockState.state] || LOCK_STYLES.editable
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 ${size === 'sm' ? 'py-0.5 text-xs' : 'py-1 text-sm'} font-medium ${s.chip}`}>
      <Icon className="h-3.5 w-3.5" />
      {lockState.label}
    </span>
  )
}

// -----------------------------------------------------------------------
// OrderEditDialog — honours freeze rules:
//   editable   → all inputs open, "Save Changes"
//   restricted → inputs open, violations highlighted, save blocked if > ±10%
//   locked     → inputs disabled; "Request Approval" button triggers mock workflow
//   Pending Approval → reviewer sees pending change + Approve / Reject
// -----------------------------------------------------------------------
function OrderEditDialog({ order, open, onOpenChange, simDay, onSaved }) {
  const [qtyMap, setQtyMap] = useState({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (order) {
      const m = {}
      for (const l of order.lines || []) m[l.skuId] = String(l.qty)
      setQtyMap(m)
      setNote('')
      setError(null)
    }
  }, [order?.orderId, open])

  if (!order) return null

  const lockState = order.lockState || { state: 'editable', label: 'Editable', maxDeltaPct: null, day: null, hint: '' }
  const isLocked = lockState.state === 'locked'
  const isRestricted = lockState.state === 'restricted'
  const isPending = order.status === 'Pending Approval' && order.pendingApproval?.status === 'pending'

  // Per-line delta %
  const deltas = (order.lines || []).map((l) => {
    const newQty = Number(qtyMap[l.skuId] || 0)
    const pct = l.qty ? ((newQty - l.qty) / l.qty) * 100 : newQty > 0 ? Infinity : 0
    return { ...l, newQty, pct }
  })
  const maxAbsDelta = deltas.reduce((m, d) => {
    const p = d.pct === Infinity ? 999 : Math.abs(d.pct)
    return Math.max(m, p)
  }, 0)
  const violatesRestricted = isRestricted && maxAbsDelta > 10
  const hasChanges = deltas.some((d) => d.newQty !== d.qty)

  const projTotalQty = deltas.reduce((s, d) => s + Math.max(0, d.newQty), 0)
  const projTotalVal = deltas.reduce((s, d) => {
    const eff = (d.effectivePrice != null) ? d.effectivePrice : d.unitPrice
    return s + Math.max(0, d.newQty) * (eff || 0)
  }, 0)

  const submit = async (action) => {
    setBusy(true)
    setError(null)
    try {
      const lines = deltas
        .filter((d) => d.newQty > 0)
        .map((d) => ({ skuId: d.skuId, qty: d.newQty }))
      const res = await fetch('/api/orders/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          lines,
          action,
          note: note || null,
          simDay: simDay || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Update failed')
      onSaved?.(j)
      onOpenChange(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const approve = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/orders/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId, action: 'approve', note: note || null, simDay: simDay || null, lines: [] }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Approve failed')
      onSaved?.(j); onOpenChange(false)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const reject = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/orders/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId, action: 'reject', note: note || null, simDay: simDay || null, lines: [] }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Reject failed')
      onSaved?.(j); onOpenChange(false)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  // Banner colour matches the rule state
  const bannerCls = isLocked
    ? 'bg-rose-50 border-rose-200 text-rose-800'
    : isRestricted
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-slate-500" />
                {isPending ? 'Review Pending Approval' : 'Edit Order'}
                <span className="font-mono text-xs text-slate-500 ml-2">{order.orderId}</span>
              </DialogTitle>
              <DialogDescription>
                {order.distributorName} · {order.region} · placed {new Date(order.createdAt).toLocaleString()}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <LockBadge lockState={lockState} />
              <Badge variant="secondary" className={`${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-700'} hover:${STATUS_STYLES[order.status]}`}>
                {order.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Rule banner */}
        <div className={`border rounded-lg p-3 text-sm flex items-start gap-2 ${bannerCls}`}>
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">{lockState.hint}</div>
            <div className="text-xs opacity-90 mt-0.5">
              {isLocked
                ? 'Changes to a locked order require a mock governance approval.'
                : isRestricted
                  ? 'You may increase or decrease any line, but no single line may move more than ±10%.'
                  : 'Freely change any quantities. Save will update the order.'}
            </div>
          </div>
        </div>

        {/* Pending approval banner for reviewer */}
        {isPending && (
          <div className="border border-violet-200 bg-violet-50 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-violet-800 font-medium">
              <Clock className="h-4 w-4" />
              Approval requested by {order.pendingApproval.requestedBy}
              <span className="text-xs font-normal text-violet-600">
                {new Date(order.pendingApproval.requestedAt).toLocaleString()}
              </span>
            </div>
            {order.pendingApproval.note && (
              <div className="mt-1 text-violet-700 italic">"{order.pendingApproval.note}"</div>
            )}
            <div className="mt-2 text-violet-700">
              Requested totals: <span className="font-semibold tabular-nums">{fmtNum(order.pendingApproval.requestedTotalQty)}</span> units ·{' '}
              <span className="font-semibold tabular-nums">{fmtMoney(order.pendingApproval.requestedTotalValue)}</span>
              {' '}(vs current {fmtNum(order.totalQty)} / {fmtMoney(order.totalValue)})
            </div>
          </div>
        )}

        {/* Lines table */}
        <div className="overflow-auto border border-slate-200 rounded-lg">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50">
                <TableHead className="text-xs uppercase tracking-wide text-slate-600">SKU</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-600 text-right">Original</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-600 text-right">New Qty</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-600 text-right">Δ%</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-600 text-right">Line Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isPending ? order.pendingApproval.requestedLines : deltas).map((row) => {
                const orig = order.lines.find((x) => x.skuId === row.skuId)
                const origQty = orig?.qty || 0
                const newQty = isPending ? row.qty : row.newQty
                const pct = origQty ? ((newQty - origQty) / origQty) * 100 : (newQty > 0 ? Infinity : 0)
                const eff = row.effectivePrice ?? row.unitPrice ?? orig?.effectivePrice ?? 0
                const lineVal = Math.max(0, newQty) * eff
                const pctCls = pct === 0 ? 'text-slate-500' :
                  isRestricted && Math.abs(pct === Infinity ? 999 : pct) > 10 ? 'text-rose-600 font-semibold' :
                    pct > 0 ? 'text-emerald-700' : 'text-slate-700'
                return (
                  <TableRow key={row.skuId}>
                    <TableCell className="py-2.5">
                      <div className="font-medium text-slate-900 text-sm">{row.skuName}</div>
                      <div className="text-xs text-slate-500 font-mono">{row.skuId}</div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-sm text-slate-600">{fmtNum(origQty)}</TableCell>
                    <TableCell className="py-2.5 text-right">
                      {isPending ? (
                        <span className="tabular-nums font-medium">{fmtNum(newQty)}</span>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          value={qtyMap[row.skuId] ?? ''}
                          onChange={(e) => setQtyMap({ ...qtyMap, [row.skuId]: e.target.value })}
                          disabled={isLocked || busy}
                          className="h-8 w-24 text-right tabular-nums ml-auto"
                        />
                      )}
                    </TableCell>
                    <TableCell className={`py-2.5 text-right tabular-nums text-sm ${pctCls}`}>
                      {origQty === 0 && newQty > 0 ? 'NEW'
                        : pct === 0 ? '—'
                          : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums text-sm">
                      {newQty > 0 ? fmtMoney(lineVal) : <span className="text-slate-400">—</span>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary + note */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">New Total Qty</div>
            <div className="text-lg font-semibold tabular-nums">
              {fmtNum(isPending ? order.pendingApproval.requestedTotalQty : projTotalQty)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">New Order Value</div>
            <div className="text-lg font-semibold tabular-nums">
              {fmtMoney(isPending ? order.pendingApproval.requestedTotalValue : projTotalVal)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Max Δ%</div>
            <div className={`text-lg font-semibold tabular-nums ${violatesRestricted ? 'text-rose-600' : 'text-slate-900'}`}>
              {isPending ? '—' : maxAbsDelta === 999 ? '>100%' : `${maxAbsDelta.toFixed(1)}%`}
            </div>
          </div>
        </div>

        {!isPending && (
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isLocked ? 'Reason for approval request (optional)' : 'Notes (optional)'}
            disabled={busy}
          />
        )}

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {isPending ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
              <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={reject} disabled={busy}>
                <X className="h-4 w-4 mr-1" />Reject
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={approve} disabled={busy}>
                <Check className="h-4 w-4 mr-1" />{busy ? 'Working…' : 'Approve & Apply'}
              </Button>
            </>
          ) : isLocked ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button
                onClick={() => submit('request_approval')}
                disabled={busy || !hasChanges}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <ShieldAlert className="h-4 w-4 mr-1" />
                {busy ? 'Submitting…' : 'Request Approval'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button
                onClick={() => submit('edit')}
                disabled={busy || violatesRestricted || !hasChanges}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Check className="h-4 w-4 mr-1" />
                {busy ? 'Saving…' : violatesRestricted ? 'Exceeds ±10% limit' : 'Save Changes'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Distributor Order Portal
//   • Pull per-distributor suggested order lines from /api/orders/suggest
//   • Editable table with: current stock, secondary sales, suggested qty,
//     scheme/promo, order qty input, line value (execution gaps → Order vs Dispatch page)
//   • Highlight high-demand SKUs (amber row + flame icon)
//   • Live KPIs: lines, order value, tentative delivery, cashflow indicator
//   • POST /api/orders/place to persist, then refresh recent-orders list
function OrdersPage({ data }) {
  const [selectedDist, setSelectedDist] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [activationGap, setActivationGap] = useState(null)
  const [qtyMap, setQtyMap] = useState({}) // { skuId: qty }
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [success, setSuccess] = useState(null) // { order }
  const [savedOrders, setSavedOrders] = useState([])
  const [errorMsg, setErrorMsg] = useState(null)

  // Order Freeze Logic controls ------------------------------------------------
  // demoDay === '' → use real today; otherwise override (1..31)
  const [demoDay, setDemoDay] = useState('')
  const [orderLock, setOrderLock] = useState(null)  // { state, label, day, hint, maxDeltaPct }
  const [editingOrder, setEditingOrder] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const simParam = demoDay ? `&simDay=${demoDay}` : ''
  const simParamFirst = demoDay ? `?simDay=${demoDay}` : ''

  // Default to first distributor once master data arrives
  useEffect(() => {
    if (!selectedDist && data.distributors?.length) {
      setSelectedDist(data.distributors[0].id)
    }
  }, [data.distributors, selectedDist])

  // Fetch current lock-state rules whenever the demo day changes
  useEffect(() => {
    fetch(`/api/orders/rules${simParamFirst}`)
      .then((r) => r.json())
      .then((j) => setOrderLock(j.lockState))
      .catch(() => setOrderLock(null))
  }, [demoDay])

  // Reload saved orders helper (used after place/edit/approve)
  const reloadOrders = async (distId = selectedDist) => {
    if (!distId) return
    try {
      const r = await fetch(`/api/orders?distributorId=${distId}${simParam}`)
      const j = await r.json()
      setSavedOrders(j.orders || [])
    } catch {
      setSavedOrders([])
    }
  }

  // Load suggestion + saved orders whenever distributor OR demo day changes
  useEffect(() => {
    if (!selectedDist) return
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)

    const loadSuggestion = fetch(`/api/orders/suggest?distributorId=${selectedDist}`)
      .then((r) => r.json())
      .then((s) => { if (!cancelled) { setSuggestion(s); setQtyMap({}); setSuccess(null) } })
      .catch((e) => !cancelled && setErrorMsg(e.message))

    const loadHistory = fetch(`/api/orders?distributorId=${selectedDist}${simParam}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setSavedOrders(j.orders || []))
      .catch(() => !cancelled && setSavedOrders([]))

    const loadActivationGap = fetch(`/api/orders/dealer-activation-gap?distributorId=${selectedDist}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setActivationGap(j))
      .catch(() => !cancelled && setActivationGap(null))

    Promise.all([loadSuggestion, loadHistory, loadActivationGap]).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [selectedDist, demoDay])

  const lines = suggestion?.lines || []
  const activationRows = activationGap?.rows || []
  const activationSummary = activationGap?.summary
  const topActivationRows = useMemo(
    () => [...activationRows].sort((a, b) => b.gapDealers - a.gapDealers).slice(0, 8),
    [activationRows],
  )
  const selectedDistObj = data.distributors?.find((d) => d.id === selectedDist)

  // Derived totals (react to input edits instantly)
  const { totalQty, totalValue, nonZeroLines } = useMemo(() => {
    let tq = 0, tv = 0, n = 0
    for (const l of lines) {
      const raw = qtyMap[l.skuId]
      const q = Number(raw || 0)
      if (q > 0) {
        n += 1
        tq += q
        const eff = l.price * (1 - (l.scheme?.discountPct || 0) / 100)
        tv += q * eff
      }
    }
    return { totalQty: tq, totalValue: Math.round(tv * 100) / 100, nonZeroLines: n }
  }, [lines, qtyMap])

  // Cashflow classification mirrors the backend thresholds (see route.js)
  const cashflow = totalValue >= CASHFLOW_ORDER_HIGH_INR ? 'high' : totalValue >= CASHFLOW_ORDER_LOW_INR ? 'medium' : 'low'
  const cashflowMeta = {
    low: { label: 'Low burn', accent: 'green', barColor: 'bg-emerald-500', pct: 28, hint: 'Comfortable working capital' },
    medium: { label: 'Moderate', accent: 'amber', barColor: 'bg-amber-500', pct: 62, hint: 'Watch receivables timing' },
    high: { label: 'High burn', accent: 'rose', barColor: 'bg-rose-500', pct: 92, hint: 'Review credit & terms before confirming' },
  }
  const cf = cashflowMeta[cashflow]

  const setQty = (skuId, value) => {
    setQtyMap((prev) => {
      const next = { ...prev }
      if (!value || Number(value) <= 0) delete next[skuId]
      else next[skuId] = value
      return next
    })
  }

  const applySuggestions = () => {
    const map = {}
    for (const l of lines) if (l.suggestedQty > 0) map[l.skuId] = String(l.suggestedQty)
    setQtyMap(map)
  }
  const clearAll = () => setQtyMap({})

  const handlePlace = async () => {
    const payloadLines = Object.entries(qtyMap)
      .map(([skuId, qty]) => ({ skuId, qty: Number(qty) }))
      .filter((l) => l.qty > 0)
    if (!payloadLines.length) return

    setPlacing(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributorId: selectedDist,
          lines: payloadLines,
          notes: notes || null,
          simDay: demoDay || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to place order')
      setSuccess(j.order)
      setQtyMap({})
      setNotes('')
      await reloadOrders(selectedDist)
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setPlacing(false)
    }
  }

  const highDemandCount = lines.filter((l) => l.isHighDemand).length
  const schemeCount = lines.filter((l) => l.scheme).length
  const suggestCount = lines.filter((l) => l.suggestedQty > 0).length

  return (
    <div>
      <SectionHeader
        title="Distributor Order Portal"
        description={
          selectedDistObj
            ? `Placing order for ${selectedDistObj.name} · ${selectedDistObj.region} · Tier ${selectedDistObj.tier}`
            : 'Select a distributor to begin'
        }
        actions={
          <>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500">Demo day:</span>
              <Select value={demoDay || 'today'} onValueChange={(v) => setDemoDay(v === 'today' ? '' : v)}>
                <SelectTrigger className="h-6 w-[100px] border-0 text-xs px-1 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="10">Day 10 · Editable</SelectItem>
                  <SelectItem value="24">Day 24 · Editable</SelectItem>
                  <SelectItem value="26">Day 26 · Restricted</SelectItem>
                  <SelectItem value="28">Day 28 · Restricted</SelectItem>
                  <SelectItem value="29">Day 29 · Locked</SelectItem>
                  <SelectItem value="30">Day 30 · Locked</SelectItem>
                </SelectContent>
              </Select>
              {orderLock && <LockBadge lockState={orderLock} />}
            </div>
            <Select value={selectedDist} onValueChange={setSelectedDist}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Choose distributor" /></SelectTrigger>
              <SelectContent>
                {(data.distributors || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={clearAll} disabled={!nonZeroLines}>
              <RotateCw className="h-4 w-4" />Clear
            </Button>
            <Button size="sm" className="gap-2" onClick={applySuggestions} disabled={!lines.length}>
              <Sparkles className="h-4 w-4" />Apply Suggestions
            </Button>
          </>
        }
      />

      {/* ---------- KPI STRIP ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Lines Selected"
          value={`${nonZeroLines} / ${lines.length}`}
          subtitle={`${fmtNum(totalQty)} units`}
          icon={Package}
          accent="blue"
        />
        <KpiCard
          title="Order Value"
          value={fmtMoney(totalValue)}
          subtitle={nonZeroLines ? `${nonZeroLines} SKU${nonZeroLines !== 1 ? 's' : ''}` : 'no lines yet'}
          icon={IndianRupee}
          accent="green"
        />
        <KpiCard
          title="Tentative Delivery"
          value={suggestion?.tentativeDeliveryDate || '—'}
          subtitle={suggestion ? `${suggestion.leadTimeDays}-day lead time` : 'awaiting data'}
          icon={Truck}
          accent="purple"
        />
        <KpiCard
          title="Cashflow Impact"
          value={cf.label}
          subtitle={cf.hint}
          icon={Wallet}
          accent={cf.accent}
        />
      </div>

      {/* ---------- DEALER ACTIVATION GAP (Stocked vs Active) ---------- */}
      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Dealer Activation Opportunity (Last Week)</CardTitle>
              <CardDescription>
                SKU-wise view of stocked dealers vs active dealers. Gap identifies activation opportunity in the distributor network.
              </CardDescription>
            </div>
            {activationSummary && (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                  Registered {fmtNum(activationSummary.registeredDealers)} dealers
                </Badge>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                  Active rate {activationSummary.activationPct.toFixed(1)}%
                </Badge>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  Impact {fmtMoney(activationSummary.potentialSecondaryValue)} potential/wk
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading activation opportunity…</div>
          ) : !topActivationRows.length ? (
            <div className="py-8 text-center text-sm text-slate-500">Activation view not available yet.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">SKU</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Product</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Stocked</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Active (last wk)</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Gap</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Activation %</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Potential Impact / wk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topActivationRows.map((r) => (
                    <TableRow key={r.skuId} className="hover:bg-slate-50/60">
                      <TableCell className="py-3"><span className="font-mono text-xs text-slate-700">{r.skuId}</span></TableCell>
                      <TableCell className="py-3">
                        <div className="font-medium text-slate-900 text-sm">{r.skuName}</div>
                        <div className="text-xs text-slate-500">{r.category}</div>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-sm">{fmtNum(r.stockedDealers)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-sm">{fmtNum(r.activeDealers)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-sm font-semibold text-amber-700">{fmtNum(r.gapDealers)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-sm">{r.activationPct.toFixed(1)}%</TableCell>
                      <TableCell className="py-3 text-right tabular-nums text-sm font-medium text-emerald-700">{fmtMoney(r.potentialSecondaryValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Cashflow meter ---------- */}
      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-700">Order Cashflow Meter</span>
              <Badge variant="secondary" className={
                cashflow === 'high' ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' :
                  cashflow === 'medium' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' :
                    'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
              }>{cf.label}</Badge>
            </div>
            <div className="text-xs text-slate-500">
              Thresholds: Low &lt; ₹20.8L · Moderate ₹20.8L–62.2L · High ≥ ₹62.2L
            </div>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${cf.barColor} transition-all duration-500`}
              style={{ width: `${Math.max(4, Math.min(100, (totalValue / ORDER_CASHFLOW_METER_MAX_INR) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1.5">
            <span>₹0</span>
            <span>₹20.8L</span>
            <span>₹41.5L</span>
            <span>₹62.2L</span>
            <span>₹83L+</span>
          </div>
        </CardContent>
      </Card>

      {/* ---------- SUCCESS / ERROR BANNERS ---------- */}
      {success && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm mb-6">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-emerald-900">
                {success._flash || 'Order placed successfully'}
              </p>
              <p className="text-sm text-emerald-800 mt-0.5">
                <span className="font-mono">{success.orderId}</span> · {fmtNum(success.totalQty)} units ·{' '}
                {fmtMoney(success.totalValue)} · ETA {success.tentativeDeliveryDate} ·{' '}
                <span className="capitalize">{success.cashflow}</span> cashflow
                {success.status && success.status !== 'Pending' && (
                  <> · status <span className="font-semibold">{success.status}</span></>
                )}
              </p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}
      {errorMsg && (
        <Card className="border-rose-200 bg-rose-50/60 shadow-sm mb-6">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-rose-800">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
              <X className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* ---------- EDITABLE SKU TABLE ---------- */}
      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">SKU Order Sheet</CardTitle>
              <CardDescription>
                {lines.length} SKUs ·{' '}
                <span className="text-amber-700 font-medium">{highDemandCount} high-demand</span> ·{' '}
                <span className="text-violet-700 font-medium">{schemeCount} with scheme</span> ·{' '}
                <span className="text-blue-700 font-medium">{suggestCount} with suggested reorder</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-amber-500" />High demand</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-violet-400" />Scheme</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading order sheet…</div>
          ) : !lines.length ? (
            <div className="py-12 text-center text-sm text-slate-500">No suggestion available yet.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">SKU</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Product</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Current Stock</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Secondary (wk avg)</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Suggested</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Scheme</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Order Qty</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Line Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => {
                    const qtyRaw = qtyMap[l.skuId] ?? ''
                    const qtyNum = Number(qtyRaw || 0)
                    const eff = l.price * (1 - (l.scheme?.discountPct || 0) / 100)
                    const lineVal = qtyNum * eff
                    const rowCls = l.isHighDemand
                      ? 'bg-amber-50/50 hover:bg-amber-50'
                      : qtyNum > 0
                        ? 'bg-blue-50/30 hover:bg-blue-50/60'
                        : 'hover:bg-slate-50/60'
                    return (
                      <TableRow key={l.skuId} className={rowCls}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-700">{l.skuId}</span>
                            {l.isHighDemand && (
                              <Flame className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="font-medium text-slate-900 text-sm">{l.skuName}</div>
                          <div className="text-xs text-slate-500">{l.category} · ₹{l.price.toFixed(2)}/unit</div>
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm tabular-nums">
                          {fmtNum(l.currentStock)}
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm tabular-nums">
                          {fmtNum(l.weeklySecondary)}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          {l.suggestedQty > 0 ? (
                            <button
                              onClick={() => setQty(l.skuId, String(l.suggestedQty))}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm tabular-nums"
                              title="Click to accept suggested quantity"
                            >
                              {fmtNum(l.suggestedQty)}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">covered</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {l.scheme ? (
                            <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-50">
                              {l.scheme.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            value={qtyRaw}
                            onChange={(e) => setQty(l.skuId, e.target.value)}
                            placeholder="0"
                            className="h-8 w-24 text-right tabular-nums ml-auto"
                          />
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums">
                          {qtyNum > 0 ? (
                            <div className="text-sm font-medium text-slate-900">{fmtMoney(lineVal)}</div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- PLACE ORDER FOOTER ---------- */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-violet-50/40 shadow-sm mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                Notes to supplier (optional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. prioritize Neckbands for festive campaign demand"
                className="bg-white"
              />
            </div>
            <div className="flex items-end gap-6">
              <div>
                <div className="text-xs text-slate-500">Total Order</div>
                <div className="text-xl font-semibold text-slate-900 tabular-nums">
                  {fmtNum(totalQty)} <span className="text-sm font-normal text-slate-500">units</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Order Value</div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">{fmtMoney(totalValue)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">ETA</div>
                <div className="text-sm font-semibold text-slate-900">
                  {suggestion?.tentativeDeliveryDate || '—'}
                </div>
              </div>
              <Button
                size="lg"
                onClick={handlePlace}
                disabled={!nonZeroLines || placing}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
                {placing ? 'Placing…' : 'Place Order'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- RECENT ORDERS FOR DISTRIBUTOR ---------- */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Recent Orders · {selectedDistObj?.name || '—'}</CardTitle>
              <CardDescription>
                {savedOrders.length
                  ? `${savedOrders.length} saved order${savedOrders.length !== 1 ? 's' : ''} · click any row to amend · governance enforced by current window (${orderLock?.label || '—'})`
                  : 'No orders placed yet for this distributor'}
              </CardDescription>
            </div>
            {orderLock && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />Day {orderLock.day} · {orderLock.hint}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {savedOrders.length ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Order</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Placed</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Units</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Value</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Cashflow</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Lock</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-slate-600 font-medium text-xs uppercase tracking-wide text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedOrders.slice(0, 10).map((o) => {
                    const cfm = { low: 'bg-emerald-50 text-emerald-700', medium: 'bg-amber-50 text-amber-700', high: 'bg-rose-50 text-rose-700' }
                    const isPendingApproval = o.status === 'Pending Approval'
                    const canAct = (o.lockState?.state !== 'locked') || isPendingApproval
                    return (
                      <TableRow key={o.orderId} className="hover:bg-slate-50/60">
                        <TableCell className="py-3">
                          <span className="font-mono text-xs text-slate-700">{o.orderId}</span>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-slate-600">
                          {new Date(o.createdAt).toLocaleString()}
                          {o.lastUpdatedAt && (
                            <div className="text-[10px] text-slate-400">upd {new Date(o.lastUpdatedAt).toLocaleTimeString()}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums text-sm">{fmtNum(o.totalQty)}</TableCell>
                        <TableCell className="py-3 text-right tabular-nums text-sm font-medium">{fmtMoney(o.totalValue)}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className={`${cfm[o.cashflow] || 'bg-slate-100 text-slate-700'} hover:${cfm[o.cashflow]} capitalize`}>
                            {o.cashflow}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <LockBadge lockState={o.lockState} />
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="secondary" className={`${STATUS_STYLES[o.status] || 'bg-slate-100 text-slate-700'} hover:${STATUS_STYLES[o.status]}`}>
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            size="sm"
                            variant={isPendingApproval ? 'default' : 'outline'}
                            className={`gap-1.5 ${isPendingApproval ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}`}
                            onClick={() => { setEditingOrder(o); setDialogOpen(true) }}
                          >
                            {isPendingApproval ? (
                              <><ShieldCheck className="h-3.5 w-3.5" />Review</>
                            ) : o.lockState?.state === 'locked' ? (
                              <><Lock className="h-3.5 w-3.5" />Request</>
                            ) : o.lockState?.state === 'restricted' ? (
                              <><ShieldAlert className="h-3.5 w-3.5" />Edit</>
                            ) : (
                              <><FileEdit className="h-3.5 w-3.5" />Edit</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              Place your first order above to see it here.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- EDIT / APPROVAL DIALOG ---------- */}
      <OrderEditDialog
        order={editingOrder}
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingOrder(null) }}
        simDay={demoDay}
        onSaved={async (resp) => {
          // Show a light banner about what happened
          setSuccess(null)
          setErrorMsg(null)
          const labels = {
            edited: 'Order amended successfully.',
            approval_requested: 'Approval request submitted. Status set to Pending Approval.',
            approved: 'Pending change approved & applied.',
            rejected: 'Pending change rejected.',
          }
          setSuccess({ ...(resp.order || {}), _flash: labels[resp.action] || 'Order updated.' })
          await reloadOrders(selectedDist)
        }}
      />
    </div>
  )
}

// Order vs Dispatch — execution gap visibility (table + grouped bar chart)
function OrderDispatchPage({ data }) {
  const [selectedDist, setSelectedDist] = useState('')
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (!selectedDist && data.distributors?.length) {
      setSelectedDist(data.distributors[0].id)
    }
  }, [data.distributors, selectedDist])

  const load = useCallback(async () => {
    if (!selectedDist) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const r = await fetch(`/api/orders/dispatch-visibility?distributorId=${selectedDist}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to load')
      setPayload(j)
    } catch (e) {
      setErrorMsg(e.message)
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDist])

  useEffect(() => {
    load()
  }, [load])

  const rows = payload?.rows || []
  const summary = payload?.summary
  const selectedDistObj = data.distributors?.find((d) => d.id === selectedDist)
  const isPersistedDispatch = payload?.dataSource === 'dispatch_records'

  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.orderedQty - a.orderedQty)
    const top = sorted.slice(0, 14)
    return top.map((r) => ({
      label: r.skuId.replace(/^SKU-/, ''),
      ordered: r.orderedQty,
      dispatched: r.dispatchedQty,
    }))
  }, [rows])

  return (
    <div>
      <SectionHeader
        title="Order vs Dispatch Visibility"
        description={
          selectedDistObj
            ? `${selectedDistObj.name} · ${selectedDistObj.region} · Tier ${selectedDistObj.tier} — ordered vs ${isPersistedDispatch ? 'persisted' : 'estimated'} dispatch to surface supply execution gaps.`
            : 'Select a distributor to view execution gaps.'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedDist} onValueChange={setSelectedDist}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Distributor" /></SelectTrigger>
              <SelectContent>
                {(data.distributors || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} · {d.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading || !selectedDist}>
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {payload?.dataSourceHint && (
        <Card className="border-slate-200/80 bg-slate-50/80 shadow-sm mb-6">
          <CardContent className="p-3 flex flex-wrap items-start gap-2 text-sm text-slate-600">
            <Activity className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <Badge variant="secondary" className="shrink-0 bg-white border border-slate-200">
              {payload.dataSource === 'dispatch_records' ? 'Persisted dispatches' : payload.dataSource === 'placed_orders' ? 'Placed orders' : 'Suggested pipeline'}
            </Badge>
            <p className="min-w-0 flex-1">{payload.dataSourceHint}</p>
          </CardContent>
        </Card>
      )}

      {errorMsg && (
        <Card className="border-rose-200 bg-rose-50/60 shadow-sm mb-6">
          <CardContent className="p-4 flex items-start gap-3 text-sm text-rose-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="flex-1">{errorMsg}</div>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-700"><X className="h-4 w-4" /></button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Ordered (units)"
          value={fmtNum(summary?.totalOrdered ?? 0)}
          subtitle={`${summary?.skuLines ?? 0} SKU lines`}
          icon={Package}
          accent="blue"
        />
        <KpiCard
          title={isPersistedDispatch ? 'Dispatched' : 'Dispatched (estimated)'}
          value={fmtNum(summary?.totalDispatched ?? 0)}
          subtitle={summary?.totalOrdered ? `${summary.fulfilmentPct}% of ordered` : '—'}
          icon={Truck}
          accent="green"
        />
        <KpiCard
          title="Execution gap"
          value={fmtNum(summary?.totalGap ?? 0)}
          subtitle="Ordered − dispatched"
          icon={TrendingDown}
          accent="rose"
        />
        <KpiCard
          title="Line status mix"
          value={`${summary?.byStatus?.['Fully fulfilled'] ?? 0} / ${summary?.byStatus?.Partial ?? 0} / ${summary?.byStatus?.Pending ?? 0}`}
          subtitle="Fulfilled · Partial · Pending"
          icon={Target}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
        <Card className="border-slate-200/70 shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Order vs dispatch
            </CardTitle>
            <CardDescription>
              Top {chartData.length} SKUs by ordered quantity — {isPersistedDispatch ? 'persisted dispatch records.' : 'estimated dispatch uses the fallback supply-adequacy rules.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading chart…</div>
            ) : !chartData.length ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">No rows to chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-32} textAnchor="end" height={68} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={48} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(v) => [fmtNum(v), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ordered" name="Ordered" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="dispatched" name={isPersistedDispatch ? 'Dispatched' : 'Dispatched (estimated)'} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SKU execution table</CardTitle>
            <CardDescription>
              Gap highlights where supply execution has not yet matched the order book ({isPersistedDispatch ? 'persisted dispatch records' : 'fallback dispatch estimate'}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">Loading…</div>
            ) : !rows.length ? (
              <div className="py-16 text-center text-sm text-slate-500">No data for this distributor.</div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-[1]">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead className="text-xs uppercase tracking-wide text-slate-600">SKU</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-slate-600">Product</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-slate-600">Ordered</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-slate-600">Dispatched</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide text-slate-600">Gap</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide text-slate-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.skuId} className={r.gap > 0 ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/60'}>
                        <TableCell className="font-mono text-xs text-slate-700 py-2.5">{r.skuId}</TableCell>
                        <TableCell className="text-sm text-slate-800 py-2.5 max-w-[200px]">
                          <div className="truncate" title={r.skuName}>{r.skuName}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm py-2.5">{fmtNum(r.orderedQty)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm py-2.5">{fmtNum(r.dispatchedQty)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium py-2.5 text-rose-700">
                          {r.gap > 0 ? fmtNum(r.gap) : '—'}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge
                            variant="secondary"
                            className={EXECUTION_STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-700'}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100 bg-gradient-to-br from-blue-50/40 to-slate-50/80 shadow-sm">
        <CardContent className="p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-1">{isPersistedDispatch ? 'Dispatch provenance' : 'How fallback dispatch is estimated'}</p>
          {isPersistedDispatch ? (
            <p>Ordered, dispatched, gap, fill-rate, and status values are read from the persisted dispatch record collection.</p>
          ) : (
            <p>
              Fulfilment rate blends last-week <span className="font-medium text-slate-700">primary ÷ secondary</span> (factory→distributor vs distributor→retail)
              as a supply-adequacy signal, a small deterministic variance per SKU, and tier service (A/B/C). This safety-net path is used only when no persisted dispatch exists.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============== PAGE: SUPPLY PLANNING ===============
function SupplyPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card className="border-2 border-indigo-200/80 shadow-xl shadow-indigo-100/60 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 rounded-3xl overflow-hidden relative">
        <CardContent className="p-8 md:p-12 text-center space-y-6 relative z-10">
          {/* Top Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Factory className="w-8 h-8" />
          </div>

          {/* Animated Header Badge */}
          {/* <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-100/80 border border-indigo-300 text-indigo-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Module Upgraded to Dedicated Studio</span>
          </div> */}

          {/* Bold Visual Headline */}
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Supply Planning Has Moved!
            </h2>
            <p className="text-base text-slate-600 font-medium">
              We built a standalone, enterprise 52-week Supply Planning Studio.
            </p>
          </div>

          {/* Prominent High-Impact Action Button */}
          <div className="pt-2">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold shadow-xl shadow-indigo-600/25 px-10 py-7 rounded-2xl gap-3 transition-all transform hover:scale-105"
              onClick={() => window.location.href = '/supply-planning'}
            >
              <span>Launch Supply Planning Studio</span>
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </Button>
          </div>

          {/* Quick Feature Visual Pills */}
          <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-700">
            <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-sm font-semibold text-slate-800">
              📊 52-Week MRP Netting
            </span>
            <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-sm font-semibold text-slate-800">
              🏭 Factory Capacity Heatmap
            </span>
            <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-sm font-semibold text-slate-800">
              🤖 AI Bottleneck Resolver
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============== PAGE: INVENTORY PLANNING ===============
function InventoryAdvancedPlanningTabs({ planning, planningLoading, cadence, setCadence, scenarioInputs, setScenarioInputs, scenarioChartData, planningStatusStyle }) {
  const healthRows = (planning?.health || []).filter((row) => row.flags.length).concat((planning?.health || []).filter((row) => !row.flags.length))
  return <Tabs defaultValue="reorder" className="space-y-4">
    <TabsList className="grid w-full max-w-2xl grid-cols-3"><TabsTrigger value="reorder">Reorder Recommendations</TabsTrigger><TabsTrigger value="scenario">Stocking Scenarios</TabsTrigger><TabsTrigger value="health">Health Check</TabsTrigger></TabsList>
    <TabsContent value="reorder" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Recommended Order" value={planningLoading ? '—' : fmtNum(planning?.recommendationSummary?.totalRecommendedUnits)} subtitle="Units after open-PO netting" icon={Package} accent="blue" />
        <KpiCard title="Order Now" value={planningLoading ? '—' : fmtNum(planning?.recommendationSummary?.orderNowCount)} subtitle="Lead-time action required" icon={AlertTriangle} accent="rose" />
        <KpiCard title="Planned Releases" value={planningLoading ? '—' : fmtNum(planning?.recommendationSummary?.plannedCount)} subtitle="Future recommended order dates" icon={CalendarDays} accent="amber" />
        <KpiCard title="Covered SKUs" value={planningLoading ? '—' : fmtNum(planning?.recommendationSummary?.coveredCount)} subtitle={planning?.nextReviewDate ? `Next review ${planning.nextReviewDate}` : 'Reviewed on request'} icon={CheckCircle2} accent="green" />
      </div>
      <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base">PO-netted Reordering Recommendations</CardTitle><CardDescription>Uses lead time, open PO balances, expected delivery dates, MOQ and order multiples from Supply Planning.</CardDescription></div><Select value={cadence} onValueChange={setCadence}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WEEKLY">Weekly review</SelectItem><SelectItem value="MONTHLY">Monthly review</SelectItem><SelectItem value="ON_REQUEST">On-request review</SelectItem></SelectContent></Select></div></CardHeader><CardContent>{planningLoading ? <div className="py-12 text-center text-sm text-slate-500">Netting inventory against open purchase orders…</div> : <DataTable columns={[{ key: 'skuName', label: 'Product' }, { key: 'lead', label: 'PO Lead Time' }, { key: 'inventoryPositionUnits', label: 'Inventory Position' }, { key: 'openPoUnits', label: 'Open PO / Next Due' }, { key: 'orderUpToUnits', label: 'Order-up-to' }, { key: 'recommendedOrderUnits', label: 'Recommended Qty' }, { key: 'recommendedOrderDate', label: 'Release Date' }, { key: 'recommendationStatus', label: 'Status' }]} rows={(planning?.recommendations || []).slice(0, 30)} renderCell={(col, row) => {
        if (col.key === 'skuName') return <div><p className="font-medium text-slate-900">{row.skuName}</p><p className="text-xs text-slate-500">{row.segment} · {row.supplierName}</p></div>
        if (col.key === 'lead') return <div><p>{row.leadTimeDays} days</p><p className="text-[11px] text-slate-500">MOQ {fmtNum(row.minimumOrderQuantity)} · multiple {fmtNum(row.orderMultiple)}</p></div>
        if (col.key === 'inventoryPositionUnits') return <div><p>{fmtNum(row.inventoryPositionUnits)}</p><p className="text-[11px] text-slate-500">On hand + open PO</p></div>
        if (col.key === 'openPoUnits') return <div><p>{fmtNum(row.openPoUnits)} units</p><p className="text-[11px] text-slate-500">{row.nextPoDueDate ? `Due ${String(row.nextPoDueDate).slice(0, 10)}` : 'No open PO'}</p></div>
        if (['orderUpToUnits', 'recommendedOrderUnits'].includes(col.key)) return <span className={col.key === 'recommendedOrderUnits' && row.recommendedOrderUnits > 0 ? 'font-semibold text-blue-700' : ''}>{fmtNum(row[col.key])}</span>
        if (col.key === 'recommendationStatus') return <Badge className={planningStatusStyle(row.recommendationStatus)}>{row.recommendationStatus.replaceAll('_', ' ')}</Badge>
        return row[col.key]
      }} />}</CardContent></Card>
    </TabsContent>
    <TabsContent value="scenario" className="space-y-4">
      <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">What-if Stocking Assumptions</CardTitle><CardDescription>Compare Lean, Baseline, Resilient and Custom 12-week inventory projections.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Demand adjustment %</label><Input type="number" min="-50" max="100" value={scenarioInputs.demandAdjustmentPct} onChange={(e) => setScenarioInputs((value) => ({ ...value, demandAdjustmentPct: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Target DOS adjustment</label><Input type="number" min="-30" max="60" value={scenarioInputs.dosAdjustmentDays} onChange={(e) => setScenarioInputs((value) => ({ ...value, dosAdjustmentDays: e.target.value }))} /></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Inbound PO realization %</label><Input type="number" min="0" max="120" value={scenarioInputs.inboundRealizationPct} onChange={(e) => setScenarioInputs((value) => ({ ...value, inboundRealizationPct: e.target.value }))} /></div>
      </div></CardContent></Card>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><Card className="border-slate-200/70 shadow-sm xl:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-base">Projected Closing Inventory</CardTitle><CardDescription>Portfolio units after forecast demand, realized inbound POs, and policy replenishment.</CardDescription></CardHeader><CardContent className="h-[320px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={scenarioChartData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => fmtNum(value)} /><Tooltip formatter={(value) => fmtNum(value)} /><Legend />{[['Lean','#f59e0b'],['Baseline','#2563eb'],['Resilient','#10b981'],['Custom','#8b5cf6']].map(([name, color]) => <Line key={name} type="monotone" dataKey={name} stroke={color} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer></CardContent></Card><Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Scenario Comparison</CardTitle><CardDescription>Inventory-service trade-off at week 12.</CardDescription></CardHeader><CardContent className="space-y-3">{(planning?.scenarios || []).map((scenario) => <div key={scenario.name} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><p className="font-medium text-slate-900">{scenario.name}</p><Badge variant="secondary">{fmtNum(scenario.summary.endingInventoryUnits)} ending</Badge></div><div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-500"><span>Avg inventory</span><span className="text-right text-slate-700">{fmtNum(scenario.summary.averageInventoryUnits)}</span><span>Lost demand</span><span className={`text-right ${scenario.summary.lostDemandUnits ? 'text-rose-600 font-medium' : 'text-emerald-600'}`}>{fmtNum(scenario.summary.lostDemandUnits)}</span></div></div>)}</CardContent></Card></div>
    </TabsContent>
    <TabsContent value="health" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard title="Stockout Risk" value={planningLoading ? '—' : fmtNum(planning?.healthSummary?.stockoutRiskCount)} subtitle={`${fmtNum(planning?.healthSummary?.stockoutExposureUnits)} units exposed`} icon={AlertTriangle} accent="rose" />
        <KpiCard title="Excess" value={planningLoading ? '—' : fmtNum(planning?.healthSummary?.excessCount)} subtitle={`${fmtNum(planning?.healthSummary?.excessUnits)} excess units`} icon={Package} accent="amber" />
        <KpiCard title="Obsolete Candidates" value={planningLoading ? '—' : fmtNum(planning?.healthSummary?.obsoleteCandidateCount)} subtitle="Slow movers with extreme DOS" icon={TrendingDown} accent="slate" />
        <KpiCard title="DOS Outliers" value={planningLoading ? '—' : fmtNum(planning?.healthSummary?.dosOutlierCount)} subtitle="Outside ±50% of norm" icon={CircleGauge} accent="purple" />
        <KpiCard title="Healthy" value={planningLoading ? '—' : fmtNum(planning?.healthSummary?.healthyCount)} subtitle="No active health flags" icon={ShieldCheck} accent="green" />
      </div>
      <Card className="border-slate-200/70 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-base">Inventory Health Check Dashboard</CardTitle><CardDescription>Prioritized stockout, excess, obsolete-candidate, and days-of-supply exceptions.</CardDescription></CardHeader><CardContent>{planningLoading ? <div className="py-12 text-center text-sm text-slate-500">Checking inventory health…</div> : <DataTable columns={[{ key: 'skuName', label: 'Product' }, { key: 'daysOfSupply', label: 'Actual / Norm DOS' }, { key: 'inventory', label: 'Inventory / Maximum' }, { key: 'projectedAtReceiptUnits', label: 'Projected at Receipt' }, { key: 'openPoUnits', label: 'Open PO' }, { key: 'exposure', label: 'Exposure' }, { key: 'primaryHealthStatus', label: 'Health Flags' }]} rows={healthRows.slice(0, 30)} renderCell={(col, row) => {
        if (col.key === 'skuName') return <div><p className="font-medium text-slate-900">{row.skuName}</p><p className="text-xs text-slate-500">{row.segment} · {row.category}</p></div>
        if (col.key === 'daysOfSupply') return <div><p className={Math.abs(row.daysOfSupply - row.effectiveDos) > row.effectiveDos * 0.5 ? 'font-semibold text-amber-700' : ''}>{row.daysOfSupply} / {row.effectiveDos}</p><p className="text-[11px] text-slate-500">days</p></div>
        if (col.key === 'inventory') return <div><p>{fmtNum(row.currentInventoryUnits)}</p><p className="text-[11px] text-slate-500">Max {fmtNum(row.maxInventoryUnits)}</p></div>
        if (['projectedAtReceiptUnits', 'openPoUnits'].includes(col.key)) return fmtNum(row[col.key])
        if (col.key === 'exposure') return <div><p className="text-rose-600">Risk {fmtNum(row.stockoutExposureUnits)}</p><p className="text-amber-700">Excess {fmtNum(row.excessUnits)}</p></div>
        if (col.key === 'primaryHealthStatus') return <div className="flex flex-wrap gap-1">{row.flags.length ? row.flags.map((flag) => <Badge key={flag} className={planningStatusStyle(flag)}>{flag.replaceAll('_', ' ')}</Badge>) : <Badge className={planningStatusStyle('HEALTHY')}>HEALTHY</Badge>}</div>
        return row[col.key]
      }} />}</CardContent></Card>
    </TabsContent>
  </Tabs>
}

function InventoryPlanningPage() {
  const [rows, setRows] = useState([])
  const [methodology, setMethodology] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const [segment, setSegment] = useState('all')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [planning, setPlanning] = useState(null)
  const [planningLoading, setPlanningLoading] = useState(true)
  const [cadence, setCadence] = useState('WEEKLY')
  const [scenarioInputs, setScenarioInputs] = useState({ demandAdjustmentPct: 0, dosAdjustmentDays: 0, inboundRealizationPct: 100 })

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/inventory/policies')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to load inventory policies')
      setRows(payload.rows || [])
      setMethodology(payload.methodology || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPlanning = useCallback(async (nextCadence, assumptions) => {
    setPlanningLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ cadence: nextCadence, ...Object.fromEntries(Object.entries(assumptions).map(([key, value]) => [key, String(value)])) })
      const response = await fetch(`/api/inventory/planning?${params}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to load inventory planning recommendations')
      setPlanning(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setPlanningLoading(false)
    }
  }, [])

  useEffect(() => { loadPolicies() }, [loadPolicies])
  useEffect(() => { loadPlanning(cadence, scenarioInputs) }, [cadence, scenarioInputs, loadPlanning])

  const categories = useMemo(() => [...new Set(rows.map((row) => row.category))].sort(), [rows])
  const visibleRows = useMemo(() => rows.filter((row) => (category === 'all' || row.category === category) && (segment === 'all' || row.segment === segment)), [rows, category, segment])
  const totalSafetyStock = rows.reduce((sum, row) => sum + row.effectiveSafetyStockUnits, 0)
  const exceptions = rows.filter((row) => row.inventoryStatus !== 'HEALTHY').length
  const erratic = rows.filter((row) => row.xyzClass === 'Z').length

  const openPolicy = (row) => setEditing({
    ...row,
    overrideDos: row.overrideDos ?? '',
    overrideSafetyStockUnits: row.overrideSafetyStockUnits ?? '',
    overrideReason: '',
  })

  const savePolicy = async () => {
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/inventory/policies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: editing.policyId,
          serviceLevelTargetPct: editing.serviceLevelTargetPct,
          overrideDos: editing.overrideDos === '' ? null : Number(editing.overrideDos),
          overrideSafetyStockUnits: editing.overrideSafetyStockUnits === '' ? null : Number(editing.overrideSafetyStockUnits),
          overrideReason: editing.overrideReason,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save inventory policy')
      setRows((current) => current.map((row) => row.policyId === payload.row.policyId ? payload.row : row))
      setEditing(null)
      loadPlanning(cadence, scenarioInputs)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const segmentStyle = (value) => value.startsWith('A') ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : value.startsWith('B') ? 'bg-violet-50 text-violet-700 hover:bg-violet-50' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
  const statusStyle = (value) => value === 'REORDER' ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' : value === 'EXCESS' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
  const planningStatusStyle = (value) => value === 'ORDER_NOW' || value === 'STOCKOUT_RISK' ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' : value === 'PLANNED' || value === 'EXCESS' || value === 'OBSOLETE_CANDIDATE' || value === 'DOS_OUTLIER' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
  const scenarioChartData = useMemo(() => {
    if (!planning?.scenarios?.length) return []
    return planning.scenarios[0].projection.map((row, index) => ({ week: row.week, ...Object.fromEntries(planning.scenarios.map((scenario) => [scenario.name, scenario.projection[index]?.closingInventoryUnits || 0])) }))
  }, [planning])

  const refreshAll = () => {
    loadPolicies()
    loadPlanning(cadence, scenarioInputs)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Inventory Planning" description="Segment SKUs, optimize norms, recommend replenishment, compare stocking scenarios, and review inventory health." actions={<Button variant="outline" onClick={refreshAll} disabled={loading || planningLoading}><RotateCw className={`h-4 w-4 mr-2 ${loading || planningLoading ? 'animate-spin' : ''}`} />Refresh</Button>} />

      {error && <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Segmented SKUs" value={loading ? '—' : fmtNum(rows.length)} subtitle="ABC value × XYZ variability" icon={Grid3x3} accent="blue" />
        <KpiCard title="Effective Safety Stock" value={loading ? '—' : fmtNum(totalSafetyStock)} subtitle="Units across active SKU policies" icon={ShieldCheck} accent="green" />
        <KpiCard title="Inventory Exceptions" value={loading ? '—' : fmtNum(exceptions)} subtitle="Reorder or excess signals" icon={AlertTriangle} accent="rose" />
        <KpiCard title="Erratic Demand" value={loading ? '—' : fmtNum(erratic)} subtitle="XYZ class Z SKUs" icon={Activity} accent="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-slate-200/70 shadow-sm xl:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">ABC/XYZ Segmentation Matrix</CardTitle><CardDescription>ABC uses cumulative tertiary consumption value; XYZ uses weekly demand variability. Select a cell to filter the policy workbench.</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div />{['X · Stable', 'Y · Variable', 'Z · Erratic'].map((label) => <div key={label} className="text-xs font-medium text-slate-500 py-2">{label}</div>)}
              {['A', 'B', 'C'].map((abc) => <div key={abc} className="contents"><div className="flex items-center justify-center font-semibold text-slate-700">{abc} · {abc === 'A' ? 'Fast' : abc === 'B' ? 'Medium' : 'Slow'}</div>{['X', 'Y', 'Z'].map((xyz) => { const key = `${abc}${xyz}`; const count = rows.filter((row) => row.segment === key).length; return <button type="button" key={key} onClick={() => setSegment(segment === key ? 'all' : key)} className={`rounded-xl border px-3 py-4 transition-colors ${segment === key ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}><span className="block text-lg font-semibold text-slate-900">{count}</span><span className="text-xs text-slate-500">{key} SKUs</span></button> })}</div>)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Optimizer Inputs</CardTitle><CardDescription>Transparent data lineage for every recommendation.</CardDescription></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div><p className="font-medium text-slate-800">Demand variability</p><p className="text-slate-500 mt-1">{methodology?.demandSource || 'Loading Demand Planning history…'}</p></div>
            <div><p className="font-medium text-slate-800">Lead time</p><p className="text-slate-500 mt-1">{methodology?.leadTimeSource || 'Loading Supply Planning source…'}</p></div>
            <div><p className="font-medium text-slate-800">Safety-stock method</p><p className="text-slate-500 mt-1">{methodology?.safetyStock || 'Loading optimizer method…'}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base">Inventory Norm Policy Workbench</CardTitle><CardDescription>System suggestions remain visible beside effective planner-controlled norms.</CardDescription></div><div className="flex gap-2"><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={segment} onValueChange={setSegment}><SelectTrigger className="w-[135px]"><SelectValue placeholder="Segment" /></SelectTrigger><SelectContent><SelectItem value="all">All segments</SelectItem>{['AX','AY','AZ','BX','BY','BZ','CX','CY','CZ'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div></CardHeader>
        <CardContent>
          {loading ? <div className="py-12 text-center text-sm text-slate-500">Optimizing inventory policies…</div> : <DataTable columns={[{ key: 'skuName', label: 'Product' }, { key: 'segment', label: 'Segment' }, { key: 'demand', label: 'Demand / CV' }, { key: 'leadTimeDays', label: 'Lead Time' }, { key: 'dos', label: 'Suggested / Effective DOS' }, { key: 'safety', label: 'Suggested / Effective SS' }, { key: 'currentInventoryUnits', label: 'Inventory / ROP' }, { key: 'inventoryStatus', label: 'Status' }, { key: 'action', label: '' }]} rows={visibleRows} renderCell={(col, row) => {
            if (col.key === 'skuName') return <div><p className="font-medium text-slate-900">{row.skuName}</p><p className="text-xs text-slate-500">{row.category}</p></div>
            if (col.key === 'segment') return <div><Badge className={segmentStyle(row.segment)}>{row.segment}</Badge><p className="text-[11px] text-slate-500 mt-1">{row.velocityClass} · {row.variabilityClass}</p></div>
            if (col.key === 'demand') return <div><p>{fmtNum(row.avgWeeklyDemand)} / week</p><p className="text-xs text-slate-500">CV {row.demandCv.toFixed(2)}</p></div>
            if (col.key === 'leadTimeDays') return <div><p>{row.leadTimeDays} days</p><p className="text-[11px] text-slate-500 max-w-[140px] truncate" title={row.leadTimeSource}>{row.leadTimeSource}</p></div>
            if (col.key === 'dos') return <div><p>{row.suggestedDos} / <span className="font-semibold text-blue-700">{row.effectiveDos}</span> days</p>{row.overrideDos !== null && <p className="text-[11px] text-blue-600">Planner override</p>}</div>
            if (col.key === 'safety') return <div><p>{fmtNum(row.suggestedSafetyStockUnits)} / <span className="font-semibold text-blue-700">{fmtNum(row.effectiveSafetyStockUnits)}</span></p><p className="text-[11px] text-slate-500">{row.serviceLevelTargetPct}% service</p></div>
            if (col.key === 'currentInventoryUnits') return <div><p>{fmtNum(row.currentInventoryUnits)} units</p><p className="text-[11px] text-slate-500">ROP {fmtNum(row.reorderPointUnits)}</p></div>
            if (col.key === 'inventoryStatus') return <Badge className={statusStyle(row.inventoryStatus)}>{row.inventoryStatus}</Badge>
            if (col.key === 'action') return <Button size="sm" variant="outline" onClick={() => openPolicy(row)}>Configure</Button>
            return row[col.key]
          }} />}
        </CardContent>
      </Card>

      <InventoryAdvancedPlanningTabs planning={planning} planningLoading={planningLoading} cadence={cadence} setCadence={setCadence} scenarioInputs={scenarioInputs} setScenarioInputs={setScenarioInputs} scenarioChartData={scenarioChartData} planningStatusStyle={planningStatusStyle} />

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Configure Inventory Norm</DialogTitle><DialogDescription>{editing?.skuName} · {editing?.segment} segment. Blank overrides revert to the system suggestion.</DialogDescription></DialogHeader>
          {editing && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Service Level Target %</label><Input type="number" min="80" max="99.9" step="0.1" value={editing.serviceLevelTargetPct} onChange={(e) => setEditing((row) => ({ ...row, serviceLevelTargetPct: e.target.value }))} /><p className="text-[11px] text-slate-500">Recalculates the suggested safety stock.</p></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">DOS Override</label><Input type="number" min="0" max="180" placeholder={`${editing.suggestedDos} suggested`} value={editing.overrideDos} onChange={(e) => setEditing((row) => ({ ...row, overrideDos: e.target.value }))} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-600">Safety Stock Override</label><Input type="number" min="0" placeholder={`${fmtNum(editing.suggestedSafetyStockUnits)} suggested`} value={editing.overrideSafetyStockUnits} onChange={(e) => setEditing((row) => ({ ...row, overrideSafetyStockUnits: e.target.value }))} /></div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600"><p className="font-medium text-slate-800">Lead-time input</p><p className="mt-1">{editing.leadTimeDays} days</p><p className="mt-1 truncate" title={editing.leadTimeSource}>{editing.leadTimeSource}</p></div>
            <div className="sm:col-span-2 space-y-1.5"><label className="text-xs font-medium text-slate-600">Change Reason</label><Input placeholder="Required when changing policy values" value={editing.overrideReason} onChange={(e) => setEditing((row) => ({ ...row, overrideReason: e.target.value }))} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={savePolicy} disabled={saving}>{saving ? 'Saving…' : 'Save Policy'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




// =============== PAGE: FINANCIAL PLANNING ===============
function FinancialPage({ data }) {
  const [planningConfig, setPlanningConfig] = useState(null)
  const [demandUplift, setDemandUplift] = useState([0])
  const [priceShift, setPriceShift] = useState([0])
  const [costShift, setCostShift] = useState([0])
  const [schemePerUnit, setSchemePerUnit] = useState([350])
  const [logisticsPerUnit, setLogisticsPerUnit] = useState([150])

  useEffect(() => {
    fetch('/api/financial/config').then((response) => response.json()).then((config) => {
      setPlanningConfig(config)
      if (Number.isFinite(Number(config.schemeCostPerUnit))) setSchemePerUnit([Number(config.schemeCostPerUnit)])
      if (Number.isFinite(Number(config.logisticsCostPerUnit))) setLogisticsPerUnit([Number(config.logisticsCostPerUnit)])
    }).catch(() => {})
  }, [])

  const businessCategoryMap = planningConfig?.businessCategoryMap || {
    'TWS Earbuds': 'TWS',
    'Neckbands': 'Neckband',
    'Smartwatches': 'Wearable',
    'Wired Audio': 'Wired',
    'Portable Speakers': 'Speaker',
  }
  const channelByDistributor = planningConfig?.channelByDistributor || {
    'DST-001': 'national',
    'DST-002': 'distributor',
    'DST-003': 'pilot',
    'DST-004': 'national',
    'DST-005': 'distributor',
  }
  const segmentByDistributor = planningConfig?.segmentByDistributor || {
    'DST-001': 'direct dealer',
    'DST-002': 'distributor',
    'DST-003': 'modern trade',
    'DST-004': 'e-commerce',
    'DST-005': 'distributor',
  }
  const collectionProfiles = planningConfig?.collectionProfiles || {
    'direct dealer': { terms: '7 days', current: 0.86, dpd0_30: 0.10, dpd30_60: 0.03, over60: 0.01 },
    distributor: { terms: '30 days', current: 0.63, dpd0_30: 0.22, dpd30_60: 0.10, over60: 0.05 },
    'modern trade': { terms: '45 days', current: 0.54, dpd0_30: 0.24, dpd30_60: 0.14, over60: 0.08 },
    'e-commerce': { terms: '15 days', current: 0.76, dpd0_30: 0.17, dpd30_60: 0.05, over60: 0.02 },
  }

  const stableUnit01 = useCallback((seed) => {
    let h = 2166136261 >>> 0
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
    return (h % 10_000) / 10_000
  }, [])

  const financialRows = useMemo(() => {
    const dFactor = 1 + demandUplift[0] / 100
    const pFactor = 1 + priceShift[0] / 100
    const cFactor = 1 + costShift[0] / 100
    const schemeCostPerUnit = Math.max(0, Number(schemePerUnit[0]) || 0)
    const logisticsCostPerUnit = Math.max(0, Number(logisticsPerUnit[0]) || 0)

    return (data.weekly || []).map((r) => {
      const forecastUnits = Math.max(0, Math.round((r.tertiary || 0) * dFactor))
      const sellingPrice = (r.price || 0) * pFactor
      const unitCost = (r.cost || 0) * cFactor
      const revenue = forecastUnits * sellingPrice
      const cost = forecastUnits * unitCost
      const schemeCost = forecastUnits * schemeCostPerUnit
      const logisticsCost = forecastUnits * logisticsCostPerUnit
      const grossProfit = revenue - cost
      const contribution = revenue - cost - schemeCost - logisticsCost
      const netRevenue = revenue - schemeCost - logisticsCost

      return {
        ...r,
        forecastUnits,
        sellingPrice,
        unitCost,
        categoryGroup: businessCategoryMap[r.category] || 'Accessories',
        channel: channelByDistributor[r.distributorId] || 'distributor',
        cashSegment: segmentByDistributor[r.distributorId] || 'distributor',
        revenue,
        cost,
        grossProfit,
        contribution,
        netRevenue,
        schemeCost,
        logisticsCost,
      }
    })
  }, [data.weekly, demandUplift, priceShift, costShift, schemePerUnit, logisticsPerUnit])

  const baselineTotals = useMemo(() => {
    const rows = data.weekly || []
    let revenue = 0
    let cost = 0
    for (const r of rows) {
      const units = r.tertiary || 0
      revenue += units * (r.price || 0)
      cost += units * (r.cost || 0)
    }
    return { revenue, profit: revenue - cost }
  }, [data.weekly])

  const totals = useMemo(() => {
    return financialRows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue
        acc.cost += r.cost
        acc.profit += r.grossProfit
        acc.contribution += r.contribution
        acc.netRevenue += r.netRevenue
        acc.forecastUnits += r.forecastUnits
        return acc
      },
      { revenue: 0, cost: 0, profit: 0, contribution: 0, netRevenue: 0, forecastUnits: 0 },
    )
  }, [financialRows])

  const marginPct = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0
  const contributionPct = totals.revenue > 0 ? (totals.contribution / totals.revenue) * 100 : 0
  const revenueDeltaPct = baselineTotals.revenue > 0 ? ((totals.revenue - baselineTotals.revenue) / baselineTotals.revenue) * 100 : 0
  const profitDeltaPct = baselineTotals.profit !== 0 ? ((totals.profit - baselineTotals.profit) / Math.abs(baselineTotals.profit)) * 100 : 0

  const revenueTrend = useMemo(() => {
    const weekMap = new Map()
    for (const w of data.weeks || []) {
      weekMap.set(w.weekId, { w: w.label, revenue: 0, netRevenue: 0 })
    }
    for (const r of financialRows) {
      if (!weekMap.has(r.weekId)) continue
      weekMap.get(r.weekId).revenue += r.revenue
      weekMap.get(r.weekId).netRevenue += r.netRevenue
    }
    return (data.weeks || []).map((w) => {
      const row = weekMap.get(w.weekId) || { w: w.label, revenue: 0, netRevenue: 0 }
      return {
        w: row.w,
        revenue: +(row.revenue / 1_000_000).toFixed(2),
        netRevenue: +(row.netRevenue / 1_000_000).toFixed(2),
      }
    })
  }, [financialRows, data.weeks])

  const profitBySku = useMemo(() => {
    const skuNames = Object.fromEntries((data.skus || []).map((s) => [s.id, s.name]))
    const map = new Map()
    for (const r of financialRows) {
      if (!map.has(r.skuId)) map.set(r.skuId, { skuId: r.skuId, sku: skuNames[r.skuId] || r.skuId, profit: 0, revenue: 0 })
      const e = map.get(r.skuId)
      e.profit += r.grossProfit
      e.revenue += r.revenue
    }
    return [...map.values()]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map((r) => ({
        sku: r.sku.length > 26 ? `${r.sku.slice(0, 26)}...` : r.sku,
        profit: +(r.profit / 1_000_000).toFixed(2),
        revenue: +(r.revenue / 1_000_000).toFixed(2),
      }))
  }, [financialRows, data.skus])

  const categoryRollup = useMemo(() => {
    const map = new Map()
    for (const r of financialRows) {
      if (!map.has(r.categoryGroup)) map.set(r.categoryGroup, { category: r.categoryGroup, revenue: 0, netRevenue: 0, contribution: 0 })
      const e = map.get(r.categoryGroup)
      e.revenue += r.revenue
      e.netRevenue += r.netRevenue
      e.contribution += r.contribution
    }
    return [...map.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((r) => ({
        ...r,
        marginPct: r.revenue > 0 ? (r.contribution / r.revenue) * 100 : 0,
      }))
  }, [financialRows])

  const channelRollup = useMemo(() => {
    const map = new Map()
    for (const r of financialRows) {
      if (!map.has(r.channel)) map.set(r.channel, { channel: r.channel, revenue: 0, forecastUnits: 0, contribution: 0 })
      const e = map.get(r.channel)
      e.revenue += r.revenue
      e.forecastUnits += r.forecastUnits
      e.contribution += r.contribution
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue)
  }, [financialRows])

  const cashflow = useMemo(() => {
    const weekIds = (data.weeks || []).slice(-13).map((w) => w.weekId)
    const weekLabels = Object.fromEntries((data.weeks || []).map((w) => [w.weekId, w.label]))
    const weekSet = new Set(weekIds)
    const trendMap = new Map()
    const segmentMap = new Map()

    for (const wk of weekIds) {
      trendMap.set(wk, { w: weekLabels[wk] || wk, due: 0, overdue: 0, expected: 0, dispatched: 0 })
    }

    for (const r of financialRows) {
      if (!weekSet.has(r.weekId)) continue
      const profile = collectionProfiles[r.cashSegment] || collectionProfiles.distributor
      const dispatched = r.revenue
      const due = dispatched * (profile.current * 0.98 + profile.dpd0_30 * 0.88)
      const overdue = dispatched * (profile.dpd30_60 * 0.55 + profile.over60 * 0.25)
      const expected = due + overdue

      const w = trendMap.get(r.weekId)
      w.due += due
      w.overdue += overdue
      w.expected += expected
      w.dispatched += dispatched

      if (!segmentMap.has(r.cashSegment)) {
        segmentMap.set(r.cashSegment, {
          segment: r.cashSegment,
          terms: profile.terms,
          dispatched: 0,
          due: 0,
          overdue: 0,
          expected: 0,
        })
      }
      const s = segmentMap.get(r.cashSegment)
      s.dispatched += dispatched
      s.due += due
      s.overdue += overdue
      s.expected += expected
    }

    return {
      trend: weekIds.map((wk) => {
        const row = trendMap.get(wk) || { w: weekLabels[wk] || wk, due: 0, overdue: 0, expected: 0, dispatched: 0 }
        return {
          w: row.w,
          due: +(row.due / 1_000_000).toFixed(2),
          overdue: +(row.overdue / 1_000_000).toFixed(2),
          expected: +(row.expected / 1_000_000).toFixed(2),
        }
      }),
      bySegment: [...segmentMap.values()].sort((a, b) => b.expected - a.expected),
    }
  }, [financialRows, data.weeks])

  const budgetVsActualVsForecast = useMemo(() => {
    const bySkuWeek = new Map()
    for (const r of financialRows) {
      const key = `${r.skuId}|${r.weekId}`
      if (!bySkuWeek.has(key)) {
        bySkuWeek.set(key, {
          skuId: r.skuId,
          sku: r.skuName,
          week: r.weekLabel,
          weekId: r.weekId,
          budget: 0,
          actual: 0,
          forecast: 0,
        })
      }
      const row = bySkuWeek.get(key)
      const actualRevenue = (r.tertiary || 0) * (r.price || 0)
      const budgetFactor = 0.92 + stableUnit01(`${r.skuId}|${r.weekId}|budget-v1`) * 0.16
      row.budget += actualRevenue * budgetFactor
      row.actual += actualRevenue
      row.forecast += r.revenue
    }

    return [...bySkuWeek.values()]
      .map((r) => {
        const fvB = r.forecast - r.budget
        const avF = r.actual - r.forecast
        const fvBPct = r.budget ? (fvB / r.budget) * 100 : 0
        const avFPct = r.forecast ? (avF / r.forecast) * 100 : 0
        const breach = Math.abs(fvBPct) >= 8 || Math.abs(avFPct) >= 8
        return {
          ...r,
          fvB,
          avF,
          fvBPct,
          avFPct,
          severity: breach ? (Math.abs(fvBPct) > 15 || Math.abs(avFPct) > 15 ? 'High' : 'Medium') : 'Low',
        }
      })
      .sort((a, b) => (Math.abs(b.fvB) + Math.abs(b.avF)) - (Math.abs(a.fvB) + Math.abs(a.avF)))
      .slice(0, 12)
  }, [financialRows, stableUnit01])

  return (
    <div>
      <SectionHeader
        title="Financial Planning"
        description="Link S&OP forecasts with revenue, profitability, and rolling collections"
        actions={
          <>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              <RotateCw className="h-3 w-3 mr-1" />Realtime preview before save
            </Badge>
            <Select defaultValue="rolling13w">
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rolling13w">Rolling 13 Weeks</SelectItem>
                <SelectItem value="rolling26w">Rolling 26 Weeks</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-slate-200/70 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Planning Inputs</CardTitle>
            <CardDescription>Edit assumptions and preview business impact instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Forecast uplift</span><span>{demandUplift[0] > 0 ? '+' : ''}{demandUplift[0]}%</span></div>
              <Slider value={demandUplift} onValueChange={setDemandUplift} min={-20} max={35} step={1} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Selling price shift</span><span>{priceShift[0] > 0 ? '+' : ''}{priceShift[0]}%</span></div>
              <Slider value={priceShift} onValueChange={setPriceShift} min={-15} max={20} step={1} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Unit cost shift</span><span>{costShift[0] > 0 ? '+' : ''}{costShift[0]}%</span></div>
              <Slider value={costShift} onValueChange={setCostShift} min={-10} max={25} step={1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Scheme / unit</span><span>₹{schemePerUnit[0]}</span></div>
                <Slider value={schemePerUnit} onValueChange={setSchemePerUnit} min={0} max={1000} step={10} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Logistics / unit</span><span>₹{logisticsPerUnit[0]}</span></div>
                <Slider value={logisticsPerUnit} onValueChange={setLogisticsPerUnit} min={0} max={500} step={10} />
              </div>
            </div>
          </CardContent>
        </Card>

        <KpiCard
          title="Revenue"
          value={fmtMoney(totals.revenue)}
          change={`${revenueDeltaPct >= 0 ? '+' : ''}${revenueDeltaPct.toFixed(1)}%`}
          trend={revenueDeltaPct >= 0 ? 'up' : 'down'}
          subtitle="Revenue = Forecast × Price"
          icon={IndianRupee}
          accent="green"
        />
        <KpiCard
          title="Profit"
          value={fmtMoney(totals.profit)}
          change={`${profitDeltaPct >= 0 ? '+' : ''}${profitDeltaPct.toFixed(1)}%`}
          trend={profitDeltaPct >= 0 ? 'up' : 'down'}
          subtitle="Profit = Revenue − Cost"
          icon={TrendingUp}
          accent="blue"
        />
        <KpiCard
          title="Margin %"
          value={`${marginPct.toFixed(1)}%`}
          subtitle={`Contribution ${contributionPct.toFixed(1)}% after scheme/logistics`}
          icon={Target}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend (₹M)</CardTitle>
            <CardDescription>Weekly rolling revenue and net revenue from the same demand signal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={290}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="basis" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Revenue" />
                <Line type="basis" dataKey="netRevenue" stroke="#10b981" strokeWidth={2.5} dot={false} name="Net Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit by SKU (Top 10 · ₹M)</CardTitle>
            <CardDescription>SKU-level profitability under current planning inputs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={profitBySku} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="sku" type="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={170} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="profit" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Rollup</CardTitle>
            <CardDescription>TWS / Neckband / Wearable / Wired / Speaker</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'category', label: 'Category' },
                { key: 'revenue', label: 'Gross Revenue' },
                { key: 'netRevenue', label: 'Net Revenue' },
                { key: 'marginPct', label: 'Contribution %' },
              ]}
              rows={categoryRollup}
              renderCell={(col, row) => {
                if (col.key === 'revenue' || col.key === 'netRevenue') return fmtMoney(row[col.key])
                if (col.key === 'marginPct') return <span className="font-medium">{row.marginPct.toFixed(1)}%</span>
                return row[col.key]
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel Rollup</CardTitle>
            <CardDescription>National / Pilot / Distributor</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'channel', label: 'Channel' },
                { key: 'forecastUnits', label: 'Forecast Units' },
                { key: 'revenue', label: 'Revenue' },
                { key: 'contribution', label: 'Contribution' },
              ]}
              rows={channelRollup}
              renderCell={(col, row) => {
                if (col.key === 'forecastUnits') return fmtNum(row.forecastUnits)
                if (col.key === 'revenue' || col.key === 'contribution') return fmtMoney(row[col.key])
                return row[col.key]
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contribution Check</CardTitle>
            <CardDescription>Gross to net bridge with scheme and logistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Gross Revenue</span><span className="font-medium">{fmtMoney(totals.revenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Scheme Cost</span><span className="font-medium text-rose-600">-{fmtMoney(Math.max(0, totals.revenue - totals.netRevenue - financialRows.reduce((s, r) => s + r.logisticsCost, 0)))}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Logistics Cost</span><span className="font-medium text-rose-600">-{fmtMoney(financialRows.reduce((s, r) => s + r.logisticsCost, 0))}</span></div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between"><span className="text-slate-700 font-medium">Net Revenue</span><span className="font-semibold">{fmtMoney(totals.netRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Cost</span><span className="font-medium text-rose-600">-{fmtMoney(totals.cost)}</span></div>
            <div className="h-px bg-slate-200" />
            <div className="flex justify-between"><span className="text-slate-700 font-medium">Contribution</span><span className={`font-semibold ${totals.contribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtMoney(totals.contribution)}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">13-Week Cash Inflow Projection (₹M)</CardTitle>
            <CardDescription>Expected collections split into due vs overdue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={cashflow.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="due" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Due Collections" />
                <Area type="monotone" dataKey="overdue" stackId="1" stroke="#f97316" fill="#fdba74" name="Overdue Collections" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel-wise Cash Flow View</CardTitle>
            <CardDescription>Distributor portal demand converted to expected collections</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'segment', label: 'Segment' },
                { key: 'terms', label: 'Terms' },
                { key: 'due', label: 'Due' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'expected', label: 'Expected Collections' },
              ]}
              rows={cashflow.bySegment}
              renderCell={(col, row) => {
                if (col.key === 'due' || col.key === 'overdue' || col.key === 'expected') return fmtMoney(row[col.key])
                return row[col.key]
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget vs Actual vs Forecast (SKU × Week)</CardTitle>
          <CardDescription>Variance flags for forecast vs budget and actuals vs forecast</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'week', label: 'Week' },
              { key: 'budget', label: 'Budget' },
              { key: 'forecast', label: 'Forecast' },
              { key: 'actual', label: 'Actual' },
              { key: 'fvB', label: 'Forecast vs Budget' },
              { key: 'avF', label: 'Actual vs Forecast' },
              { key: 'severity', label: 'Flag' },
            ]}
            rows={budgetVsActualVsForecast}
            renderCell={(col, row) => {
              if (col.key === 'budget' || col.key === 'forecast' || col.key === 'actual') return fmtMoney(row[col.key])
              if (col.key === 'fvB' || col.key === 'avF') {
                const value = row[col.key]
                const pct = col.key === 'fvB' ? row.fvBPct : row.avFPct
                const pos = value >= 0
                return (
                  <span className={pos ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                    {pos ? '+' : '-'}{fmtMoney(Math.abs(value))} ({pos ? '+' : '-'}{Math.abs(pct).toFixed(1)}%)
                  </span>
                )
              }
              if (col.key === 'severity') {
                const map = {
                  High: 'bg-rose-50 text-rose-700',
                  Medium: 'bg-amber-50 text-amber-700',
                  Low: 'bg-emerald-50 text-emerald-700',
                }
                return <Badge variant="secondary" className={`${map[row.severity]} hover:${map[row.severity]}`}>{row.severity}</Badge>
              }
              return row[col.key]
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =============== PAGE: SCENARIO PLANNING ===============
function ScenarioPage({ data }) {
  const [demand, setDemand] = useState([5])
  const [cost, setCost] = useState([0])
  const [capacity, setCapacity] = useState([0])

  const scenarios = buildWhatIfScenarioComparison(data.kpis, { demandPct: demand[0], costPct: cost[0], capacityPct: capacity[0] })

  return (
    <div>
      <SectionHeader
        title="Scenario Planning"
        description="Model what-if scenarios against the consensus plan"
        actions={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New Scenario</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Demand Uplift</CardTitle>
            <CardDescription className="text-xs">Applied to all SKUs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-slate-900">{demand[0] > 0 ? '+' : ''}{demand[0]}%</span>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Demand</Badge>
            </div>
            <Slider value={demand} onValueChange={setDemand} min={-20} max={30} step={1} />
            <div className="flex justify-between text-xs text-slate-500"><span>-20%</span><span>+30%</span></div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Input Cost Shift</CardTitle>
            <CardDescription className="text-xs">COGS pressure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-slate-900">{cost[0] > 0 ? '+' : ''}{cost[0]}%</span>
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50">Cost</Badge>
            </div>
            <Slider value={cost} onValueChange={setCost} min={-10} max={25} step={1} />
            <div className="flex justify-between text-xs text-slate-500"><span>-10%</span><span>+25%</span></div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Capacity Change</CardTitle>
            <CardDescription className="text-xs">Network availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-slate-900">{capacity[0] > 0 ? '+' : ''}{capacity[0]}%</span>
              <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-50">Capacity</Badge>
            </div>
            <Slider value={capacity} onValueChange={setCapacity} min={-15} max={20} step={1} />
            <div className="flex justify-between text-xs text-slate-500"><span>-15%</span><span>+20%</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Scenario vs Baseline</CardTitle>
              <CardDescription>Revenue projection by quarter (₹M)</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              <Sparkles className="h-3 w-3 mr-1" />Live simulation
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scenarios}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="q" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scenario" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gm" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saved Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'owner', label: 'Owner' },
              { key: 'rev', label: 'Revenue Δ' },
              { key: 'gm', label: 'GM Δ' },
              { key: 'updated', label: 'Updated' },
              { key: 'status', label: 'Status' },
            ]}
            rows={(data.scenarios || []).map((scenario) => ({
              name: scenario.scenarioName,
              owner: scenario.createdBy,
              rev: scenario.revenueAtRiskRecovered == null ? 'Not calculated' : fmtMoney(scenario.revenueAtRiskRecovered),
              gm: scenario.costVarianceInr == null ? 'Not calculated' : fmtMoney(-scenario.costVarianceInr),
              updated: scenario.updatedAt ? new Date(scenario.updatedAt).toLocaleDateString() : '',
              status: scenario.status || 'Stored',
            }))}
            renderCell={(col, row) => {
              if (col.key === 'status') {
                const map = { Active: 'bg-blue-50 text-blue-700', Draft: 'bg-slate-100 text-slate-700', Approved: 'bg-emerald-50 text-emerald-700', Archived: 'bg-slate-100 text-slate-500', Stored: 'bg-blue-50 text-blue-700' }
                return <Badge variant="secondary" className={`${map[row.status] || map.Stored}`}>{row.status}</Badge>
              }
              if (col.key === 'rev' || col.key === 'gm') {
                const pos = !row[col.key].startsWith('-')
                return <span className={pos ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>{row[col.key]}</span>
              }
              return row[col.key]
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}


// =============== PAGE: DEMAND FACTORS ===============
// Interactive visualization of factors impacting demand forecasting
// Features: PLC stages, Seasonality patterns, Promotions, Location factors, Competitor comparison
function DemandFactorsPage({ data }) {
  // Featured SKUs for dropdown selection (ensure baseDemand and valid plc exist for all SKUs)
  const featuredSkus = (data.skus || []).map((sku) => {
    const rawPlc = sku.lifecycleStage || 'MATURE'
    let plc = 'Mature'
    if (rawPlc === 'MATURE' || rawPlc === 'Mature') plc = 'Mature'
    else if (rawPlc === 'GROWTH' || rawPlc === 'Growth') plc = 'Growth'
    else if (rawPlc === 'DECLINE' || rawPlc === 'Decline') plc = 'Decline'
    else if (rawPlc === 'NPI' || rawPlc === 'Npi' || rawPlc === 'NEW' || rawPlc === 'New') plc = 'New'
    else plc = rawPlc.charAt(0).toUpperCase() + rawPlc.slice(1).toLowerCase()

    return {
      ...sku,
      baseDemand: Number(sku.baseDemand ?? sku.baseWeekly ?? 1000),
      plc,
    }
  })

  const [selectedSku, setSelectedSku] = useState('SKU-BOAT-LD100')
  const [factors, setFactors] = useState({
    plc: true,
    seasonality: true,
    promotions: true,
    location: false,
  })

  const fallbackSku = featuredSkus[0] || {
    id: 'SKU-BOAT-LD100',
    name: 'boAt Lunar Discovery',
    category: 'Smartwatches',
    plc: 'New',
    baseDemand: 420,
  }

  const currentSku = featuredSkus.find(s => s.id === selectedSku) || fallbackSku

  // PLC multipliers
  const plcMultipliers = data.factorConfig?.plcMultipliers || {
    'New': 1.2,
    'Growth': 1.5,
    'Mature': 1.0,
    'Decline': 0.7,
    'Npi': 1.2,
    'NPI': 1.2,
  }

  // Seasonality patterns by category (12 months)
  const seasonalityPatterns = data.factorConfig?.seasonalityPatterns || {
    'Smartwatches': [0.92, 0.90, 0.95, 1.00, 1.03, 1.05, 1.08, 1.10, 1.18, 1.32, 1.38, 1.24],
    'TWS Earbuds': [0.94, 0.92, 0.96, 1.00, 1.02, 1.06, 1.10, 1.14, 1.22, 1.30, 1.34, 1.20],
    'Neckbands': [0.96, 0.95, 0.98, 1.00, 1.03, 1.05, 1.08, 1.11, 1.16, 1.24, 1.28, 1.14],
    'Wired Audio': [1.08, 1.06, 1.02, 0.98, 0.94, 0.92, 0.90, 0.92, 0.98, 1.08, 1.16, 1.18],
    'Portable Speakers': [0.90, 0.88, 0.92, 0.98, 1.02, 1.08, 1.12, 1.18, 1.24, 1.36, 1.42, 1.26],
  }

  // Promotion schedule (weeks with active promotions)
  const promotionWeeks = data.factorConfig?.promotionWeeks || [8, 9, 15, 16, 22, 23]
  const promotionUplift = data.factorConfig?.promotionUplift || 1.4

  // Regional multipliers
  const regionMultipliers = data.factorConfig?.regionMultipliers || {
    'North': {
      'Smartwatches': 1.12,
      'TWS Earbuds': 1.08,
      'Neckbands': 0.96,
      'Wired Audio': 1.05,
      'Portable Speakers': 1.10,
    },
    'South': {
      'Smartwatches': 0.94,
      'TWS Earbuds': 0.98,
      'Neckbands': 1.14,
      'Wired Audio': 0.92,
      'Portable Speakers': 1.02,
    },
    'West': {
      'Smartwatches': 1.04,
      'TWS Earbuds': 1.06,
      'Neckbands': 1.00,
      'Wired Audio': 0.98,
      'Portable Speakers': 1.08,
    },
  }

  const generateDemandData = () => {
    const byWeek = new Map()
    ;(data.weekly || []).filter((row) => row.skuId === currentSku.id).forEach((row) => {
      const current = byWeek.get(row.weekId) || { week: row.weekId, base: 0, adjusted: 0, plcOnly: 0, withSeasonal: 0, hasPromo: false }
      current.base += Number(row.secondary || 0)
      current.adjusted += Number(row.tertiary || 0)
      current.plcOnly += Number(row.secondary || 0)
      current.withSeasonal += Number(row.tertiary || 0)
      byWeek.set(row.weekId, current)
    })
    return Array.from(byWeek.values()).sort((a, b) => a.week.localeCompare(b.week))
  }

  const demandData = generateDemandData()

  const competitorData = [{ name: 'boAt actual', value: demandData.length ? Math.round(demandData.reduce((sum, row) => sum + row.adjusted, 0) / demandData.length) : 0, color: '#3b82f6' }]

  // Calculate impact percentages
  const calculateImpact = () => {
    const base = demandData.reduce((sum, d) => sum + d.base, 0)
    const adjusted = demandData.reduce((sum, d) => sum + d.adjusted, 0)
    const diff = base > 0 ? ((adjusted - base) / base * 100).toFixed(1) : '0.0'
    return { base, adjusted, diff }
  }

  const impact = calculateImpact()

  const toggleFactor = (factor) => {
    setFactors(prev => ({ ...prev, [factor]: !prev[factor] }))
  }

  const plcColors = {
    'New': 'bg-cyan-50 text-cyan-700 border-cyan-300',
    'Npi': 'bg-cyan-50 text-cyan-700 border-cyan-300',
    'NPI': 'bg-cyan-50 text-cyan-700 border-cyan-300',
    'Growth': 'bg-emerald-50 text-emerald-700 border-emerald-300',
    'Mature': 'bg-blue-50 text-blue-700 border-blue-300',
    'Decline': 'bg-rose-50 text-rose-700 border-rose-300',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Demand Factors Analysis</h2>
          <p className="text-sm text-slate-500 mt-1">Visualize how PLC, seasonality, promotions, and location impact demand forecasting</p>
        </div>
        <Badge className={`${plcColors[currentSku.plc] || plcColors['Mature']} text-xs font-semibold px-3 py-1.5`}>
          {currentSku.plc} Stage · {((plcMultipliers[currentSku.plc] ?? 1.0) * 100).toFixed(0)}% multiplier
        </Badge>
      </div>

      {/* SKU Selector & Factor Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SKU Selection */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Select SKU to Analyze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSku} onValueChange={setSelectedSku}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {featuredSkus.map(sku => (
                  <SelectItem key={sku.id} value={sku.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sku.name}</span>
                      <Badge variant="secondary" className="text-xs">{sku.category}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Base Weekly Demand</div>
              <div className="text-2xl font-bold text-slate-900">{(currentSku.baseDemand ?? 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-1">units/week</div>
            </div>
          </CardContent>
        </Card>

        {/* Factor Toggles */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Active Demand Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* PLC Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Product Life Cycle</div>
                    <div className="text-xs text-slate-500">{currentSku.plc} · {((plcMultipliers[currentSku.plc] ?? 1.0) * 100).toFixed(0)}% impact</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFactor('plc')}
                  className="p-1 h-8"
                >
                  {factors.plc ? (
                    <ToggleRight className="h-6 w-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-400" />
                  )}
                </Button>
              </div>

              {/* Seasonality Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-violet-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Seasonality</div>
                    <div className="text-xs text-slate-500">{currentSku.category || 'Product'} seasonal pattern</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFactor('seasonality')}
                  className="p-1 h-8"
                >
                  {factors.seasonality ? (
                    <ToggleRight className="h-6 w-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-400" />
                  )}
                </Button>
              </div>

              {/* Promotions Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-4 w-4 text-rose-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Promotions</div>
                    <div className="text-xs text-slate-500">+40% uplift during campaigns</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFactor('promotions')}
                  className="p-1 h-8"
                >
                  {factors.promotions ? (
                    <ToggleRight className="h-6 w-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-400" />
                  )}
                </Button>
              </div>

              {/* Location Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Location</div>
                    <div className="text-xs text-slate-500">Regional demand variations</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFactor('location')}
                  className="p-1 h-8"
                >
                  {factors.location ? (
                    <ToggleRight className="h-6 w-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Base Demand (26 weeks)</div>
              <div className="text-2xl font-bold text-slate-900">{(impact.base || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Adjusted Demand</div>
              <div className="text-2xl font-bold text-blue-600">{(impact.adjusted || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Total Impact</div>
              <div className={`text-2xl font-bold ${Number(impact.diff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Number(impact.diff) >= 0 ? '+' : ''}{impact.diff}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Demand Forecast with Active Factors (26 Weeks)
          </CardTitle>
          <CardDescription>
            {factors.plc && <span className="mr-2">✓ PLC</span>}
            {factors.seasonality && <span className="mr-2">✓ Seasonality</span>}
            {factors.promotions && <span className="mr-2">✓ Promotions</span>}
            {factors.location && <span className="mr-2">✓ Location</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={demandData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="base"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
                name="Base Demand"
              />
              <Line
                type="monotone"
                dataKey="adjusted"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  if (payload.hasPromo && factors.promotions) {
                    return (
                      <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                    )
                  }
                  return null
                }}
                name="Adjusted Demand"
              />
            </LineChart>
          </ResponsiveContainer>
          {factors.promotions && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Promotion Period (+40%)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factor Breakdown & Competitor Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Factor Impact Breakdown */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Factor Impact Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <Target className={`h-4 w-4 ${factors.plc ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Product Life Cycle</span>
                </div>
                <span className={`text-sm font-semibold ${factors.plc ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {factors.plc ? `${(((plcMultipliers[currentSku.plc] ?? 1.0) - 1) * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <CalendarDays className={`h-4 w-4 ${factors.seasonality ? 'text-violet-600' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Seasonality</span>
                </div>
                <span className={`text-sm font-semibold ${factors.seasonality ? 'text-violet-600' : 'text-slate-400'}`}>
                  {factors.seasonality ? '±20-40%' : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <Megaphone className={`h-4 w-4 ${factors.promotions ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Promotions</span>
                </div>
                <span className={`text-sm font-semibold ${factors.promotions ? 'text-rose-600' : 'text-slate-400'}`}>
                  {factors.promotions ? '+40%' : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <MapPin className={`h-4 w-4 ${factors.location ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Location (North)</span>
                </div>
                <span className={`text-sm font-semibold ${factors.location ? 'text-blue-600' : 'text-slate-400'}`}>
                  {factors.location ? `${(((regionMultipliers['North']?.[currentSku.category] ?? 1.0) - 1) * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competitor Comparison */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Competitor Demand Comparison
            </CardTitle>
            <CardDescription>Average weekly demand (same category)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={competitorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: '12px' }} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {competitorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">Market Position:</span>
                <span>Leading in {currentSku.category || 'Audio'} category</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Comparison (when location factor is active) */}
      {factors.location && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              Regional Demand Variations
            </CardTitle>
            <CardDescription>How demand varies across different regions for {currentSku.category || 'Product'} products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(regionMultipliers).map(([region, multipliers]) => {
                const multiplier = multipliers[currentSku.category] ?? 1.0
                const adjustedDemand = Math.round((currentSku.baseDemand ?? 0) * multiplier)
                const diff = ((multiplier - 1) * 100).toFixed(0)
                return (
                  <div key={region} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-sm font-semibold text-slate-900 mb-2">{region}</div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">{adjustedDemand.toLocaleString()}</div>
                    <div className={`text-sm font-medium ${Number(diff) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {Number(diff) >= 0 ? '+' : ''}{diff}% vs baseline
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============== PAGE: CHATBOT ===============
// =============== PAGE: CHATBOT — S&OP AI ASSISTANT ===============
// Three-column layout:
//   ┌─── Alerts + Suggestions ─┬── Chat thread ──────┬── Context panel ──┐
//   │ Exception alert cards     │ user/assistant bubbles│ KPIs the bot sees │
//   │ Curated questions by cat  │ structured cards      │ active session id │
//   └───────────────────────────┴───────────────────────┴────────────────────┘
// Uses POST /api/chat/message (Groq Llama 3.1-8B) + /api/chat/insights + /api/chat/suggestions.

// Severity → colour helper used in several places
const SEVERITY_STYLES = {
  high: { chip: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'text-rose-600', dot: 'bg-rose-500' },
  medium: { chip: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'text-amber-600', dot: 'bg-amber-500' },
  low: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'text-emerald-600', dot: 'bg-emerald-500' },
}
const INSIGHT_ICON = {
  overstock: Package,
  stockout: AlertTriangle,
  demand_exceeds_supply: TrendingUp,
  demand_spike: Flame,
  demand_growth: ArrowUpRight,
  scheme_roi: Sparkles,
  distributor_underperform: ArrowDownRight,
}
const CARD_ACCENTS = {
  rose: { bar: 'border-rose-400 bg-rose-50/40', title: 'text-rose-900' },
  amber: { bar: 'border-amber-400 bg-amber-50/40', title: 'text-amber-900' },
  blue: { bar: 'border-blue-400 bg-blue-50/40', title: 'text-blue-900' },
  violet: { bar: 'border-violet-400 bg-violet-50/40', title: 'text-violet-900' },
  emerald: { bar: 'border-emerald-400 bg-emerald-50/40', title: 'text-emerald-900' },
  slate: { bar: 'border-slate-300 bg-slate-50/50', title: 'text-slate-900' },
}

// Lightweight markdown-ish renderer for the bot reply:
//   **bold**  · *italic*  · bullets ("- " / "* ")  · paragraphs split on blank lines
const renderBotText = (text) => {
  const lines = (text || '').split('\n')
  const blocks = []
  let buf = []
  const flushParagraph = () => {
    if (buf.length) {
      blocks.push({ kind: 'p', content: buf.join(' ') })
      buf = []
    }
  }
  let bulletBuf = null
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph()
      if (!bulletBuf) bulletBuf = []
      bulletBuf.push(line.replace(/^\s*[-*]\s+/, ''))
    } else if (line === '') {
      flushParagraph()
      if (bulletBuf) { blocks.push({ kind: 'ul', items: bulletBuf }); bulletBuf = null }
    } else {
      if (bulletBuf) { blocks.push({ kind: 'ul', items: bulletBuf }); bulletBuf = null }
      buf.push(line)
    }
  }
  flushParagraph()
  if (bulletBuf) blocks.push({ kind: 'ul', items: bulletBuf })

  // Inline markdown (bold/italic) — simple regex
  const inline = (str) => {
    const parts = []
    let i = 0
    const push = (el) => parts.push(el)
    const src = str
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
    let last = 0
    let m
    let key = 0
    while ((m = re.exec(src)) !== null) {
      if (m.index > last) push(src.slice(last, m.index))
      if (m[2]) push(<strong key={'b' + key++}>{m[2]}</strong>)
      else if (m[3]) push(<em key={'i' + key++}>{m[3]}</em>)
      else if (m[4]) push(<code key={'c' + key++} className="px-1 bg-slate-200 rounded text-xs font-mono">{m[4]}</code>)
      last = m.index + m[0].length
    }
    if (last < src.length) push(src.slice(last))
    return parts.length ? parts : [src]
  }

  return blocks.map((b, idx) => {
    if (b.kind === 'ul') {
      return (
        <ul key={idx} className="list-disc pl-5 space-y-1 my-2">
          {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
        </ul>
      )
    }
    return <p key={idx} className="my-2 leading-relaxed">{inline(b.content)}</p>
  })
}

// Structured card renderer for bot replies
const ChatCard = ({ card }) => {
  const accent = CARD_ACCENTS[card.accent] || CARD_ACCENTS.blue
  if (card.kind === 'risk_table' || card.kind === 'rank_table') {
    return (
      <div className={`rounded-lg border-l-4 ${accent.bar} p-0 overflow-hidden mt-3 border border-slate-200`}>
        <div className="px-4 py-2.5 bg-white/70 border-b border-slate-200">
          <div className={`text-sm font-semibold ${accent.title}`}>{card.title}</div>
        </div>
        <div className="bg-white overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50">
                {card.columns.map((c) => (
                  <TableHead key={c} className="text-slate-600 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {card.rows.map((row, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50/50">
                  {Object.values(row).map((v, j) => {
                    const s = String(v)
                    const isSeverity = ['high', 'medium', 'low'].includes(s)
                    const isStatus = ['watch', 'healthy', 'overstock'].includes(s)
                    return (
                      <TableCell key={j} className="py-2.5 text-sm">
                        {isSeverity ? (
                          <Badge variant="secondary" className={`${SEVERITY_STYLES[s].chip} hover:${SEVERITY_STYLES[s].chip} capitalize`}>{s}</Badge>
                        ) : isStatus ? (
                          <Badge variant="secondary" className={`capitalize ${s === 'watch' ? 'bg-amber-50 text-amber-700' : s === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{s}</Badge>
                        ) : s}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }
  if (card.kind === 'rec_list') {
    return (
      <div className={`rounded-lg border-l-4 ${accent.bar} p-0 mt-3 border border-slate-200 bg-white`}>
        <div className="px-4 py-2.5 border-b border-slate-200">
          <div className={`text-sm font-semibold ${accent.title}`}>{card.title}</div>
        </div>
        <div className="divide-y divide-slate-100">
          {card.items.map((it, idx) => {
            const sevStyle = SEVERITY_STYLES[it.severity] || SEVERITY_STYLES.medium
            return (
              <div key={idx} className="px-4 py-3 flex gap-3">
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${sevStyle.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-medium text-slate-900 text-sm">{it.title}</div>
                    <Badge variant="secondary" className={`${sevStyle.chip} hover:${sevStyle.chip} capitalize text-[10px]`}>{it.severity}</Badge>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{it.detail}</div>
                  {it.action && (
                    <div className="mt-1.5 text-xs text-slate-700 flex items-start gap-1.5">
                      <ArrowUpRight className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
                      <span>{it.action}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

function ChatbotPage({ data }) {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [insights, setInsights] = useState([])
  const [insightsBySeverity, setInsightsBySeverity] = useState({ high: 0, medium: 0, low: 0 })
  const [suggestions, setSuggestions] = useState([])
  const [health, setHealth] = useState(null)
  const [chatError, setChatError] = useState(null)
  const scrollerRef = useRef(null)

  // Load insights + suggestions + health on mount
  useEffect(() => {
    fetch('/api/chat/insights').then((r) => r.json()).then((j) => {
      setInsights(j.insights || [])
      setInsightsBySeverity(j.bySeverity || { high: 0, medium: 0, low: 0 })
    }).catch(() => { })
    fetch('/api/chat/suggestions').then((r) => r.json()).then((j) => {
      setSuggestions(j.suggestions || [])
    }).catch(() => { })
    fetch('/api/chat/health').then((r) => r.json()).then((j) => setHealth(j)).catch(() => { })
    // Greet user
    setMessages([{
      role: 'assistant',
      text: "Hi — I'm your S&OP AI analyst. I have live access to your 15 SKUs, 5 distributors, 3 regions and 6 months of weekly data. Ask me anything about stock risk, production planning, distributor performance, scheme ROI, or run a what-if scenario.",
      cards: [],
      intent: 'greeting',
      ts: new Date().toISOString(),
    }])
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
    }
  }, [messages, thinking])

  const send = async (txt) => {
    const msg = (txt ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    setChatError(null)
    setMessages((prev) => [...prev, { role: 'user', text: msg, ts: new Date().toISOString() }])
    setThinking(true)
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: msg }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Chat failed')
      if (j.sessionId && !sessionId) setSessionId(j.sessionId)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: j.reply,
        cards: j.cards || [],
        intent: j.intent,
        insightsUsed: j.insightsUsed || [],
        llmError: j.llmError,
        model: j.model,
        usage: j.llmUsage,
        ts: j.timestamp,
      }])
    } catch (e) {
      setChatError(e.message)
    } finally {
      setThinking(false)
    }
  }

  const resetSession = async () => {
    try {
      const res = await fetch('/api/chat/session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const j = await res.json()
      setSessionId(j.sessionId || null)
    } catch { /* noop */ }
    setMessages([{
      role: 'assistant',
      text: "Fresh session. What would you like to explore?",
      cards: [], intent: 'greeting', ts: new Date().toISOString(),
    }])
  }

  // Group insights by type for alerts panel (show top 6 by severity)
  const topAlerts = insights.slice(0, 6)
  // Group suggestions by category
  const suggestionsByCategory = useMemo(() => {
    const m = {}
    for (const s of suggestions) {
      if (!m[s.category]) m[s.category] = []
      m[s.category].push(s)
    }
    return m
  }, [suggestions])

  const kpis = data.kpis || {}
  const categories = useMemo(() => [...new Set((data.skus || []).map((s) => s.category))], [data.skus])

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        title="S&OP AI Assistant"
        description="Ask natural-language questions. Answers are on the basis live data."
        actions={
          <>
            <Badge variant="secondary" className="bg-violet-50 text-violet-700 hover:bg-violet-50 gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              {health?.model || 'Llama 3.1 8B'}
            </Badge>
            {sessionId && (
              <span className="text-xs text-slate-500 font-mono">{sessionId}</span>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={resetSession}>
              <RotateCw className="h-4 w-4" />New Chat
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-[640px]">
        {/* =============== LEFT COLUMN: ALERTS + SUGGESTIONS =============== */}
        <aside className="col-span-12 xl:col-span-3 flex flex-col gap-4 order-2 xl:order-1">
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Exception Alerts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {insights.length} alerts · {insightsBySeverity.high || 0} high · {insightsBySeverity.medium || 0} med
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
              {topAlerts.length === 0 && (
                <div className="text-xs text-slate-500 py-4 text-center">No exceptions detected.</div>
              )}
              {topAlerts.map((a) => {
                const Icon = INSIGHT_ICON[a.type] || AlertTriangle
                const s = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.medium
                return (
                  <button
                    key={a.id}
                    onClick={() => send(`Tell me more about ${a.title}`)}
                    className="w-full text-left rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-colors p-2.5 group"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 ${s.icon}`}><Icon className="h-3.5 w-3.5" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          <span className="text-xs font-medium text-slate-900 truncate">{a.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.message}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 shadow-sm flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Suggested Questions
              </CardTitle>
              <CardDescription className="text-xs">Click to auto-fill the chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {Object.entries(suggestionsByCategory).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">{cat}</div>
                  <div className="space-y-1">
                    {items.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => send(s.q)}
                        disabled={thinking}
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors"
                      >
                        {s.q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* =============== CENTER COLUMN: CHAT THREAD =============== */}
        <main className="col-span-12 xl:col-span-6 order-1 xl:order-2">
          <Card className="border-slate-200/70 shadow-sm flex flex-col h-full min-h-[640px]">
            <CardHeader className="pb-2 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                    <Image src={BRAND_LOGO_URL} alt="boAt logo" width={36} height={36} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">boAt Planning Intelligence</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {health?.hasGroqKey ? 'online' : 'unavailable'}
                      {insights.length > 0 && <> · tracking <span className="font-medium text-slate-700">{insights.length}</span> exceptions</>}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent ref={scrollerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-50/40 to-white">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      <Image src={BRAND_LOGO_URL} alt="boAt logo" width={32} height={32} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className={`${m.role === 'user' ? 'max-w-[80%]' : 'max-w-[92%]'} flex-1`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm ${m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm ml-auto w-fit'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                      }`}>
                      {m.role === 'user' ? m.text : renderBotText(m.text)}
                      {m.role === 'assistant' && m.llmError && (
                        <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5" />
                          <span>LLM fallback engaged: {m.llmError}</span>
                        </div>
                      )}
                    </div>
                    {/* Structured cards */}
                    {m.role === 'assistant' && m.cards?.map((c, idx) => <ChatCard key={idx} card={c} />)}
                    {/* Insights used (thinking reveal) */}
                    {m.role === 'assistant' && m.insightsUsed && m.insightsUsed.length > 0 && (
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer hover:text-slate-700">
                          Grounded in {m.insightsUsed.length} live insight{m.insightsUsed.length !== 1 ? 's' : ''} · intent: <span className="font-mono">{m.intent}</span>
                        </summary>
                        <div className="mt-1 space-y-0.5 pl-3">
                          {m.insightsUsed.map((i) => (
                            <div key={i.id} className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLES[i.severity]?.dot || 'bg-slate-400'}`} />
                              <span className="text-[11px]">{i.title}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                      <CircleUser className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 text-slate-500 text-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <span className="text-xs ml-1">Analyzing data…</span>
                  </div>
                </div>
              )}
              {chatError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}
            </CardContent>
            <div className="border-t border-slate-200 p-3 bg-white">
              <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about stock risk, production, distributors, schemes…"
                  disabled={thinking}
                  className="flex-1"
                />
                <Button type="submit" className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-95" disabled={thinking || !input.trim()}>
                  <Send className="h-4 w-4" />Send
                </Button>
              </form>
            </div>
          </Card>
        </main>

        {/* =============== RIGHT COLUMN: CONTEXT PANEL =============== */}
        <aside className="col-span-12 xl:col-span-3 flex flex-col gap-4 order-3">
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                Data the Bot Sees
              </CardTitle>
              <CardDescription className="text-xs">Live from S&OP dataset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Revenue</div>
                  <div className="text-sm font-semibold tabular-nums">{fmtMoney(kpis.totalRevenue || 0)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">GM%</div>
                  <div className="text-sm font-semibold tabular-nums">{(kpis.gmPct || 0).toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Demand</div>
                  <div className="text-sm font-semibold tabular-nums">{fmtNum(kpis.totalDemand || 0)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">WoW</div>
                  <div className={`text-sm font-semibold tabular-nums ${(kpis.demandWoW || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {(kpis.demandWoW || 0) >= 0 ? '+' : ''}{(kpis.demandWoW || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between"><span className="text-slate-500">SKUs</span><span className="font-medium">{data.skus?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Categories</span><span className="font-medium">{categories.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Distributors</span><span className="font-medium">{data.distributors?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Regions</span><span className="font-medium">{data.regions?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Weeks tracked</span><span className="font-medium">{data.meta?.weekCount || 0}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* <Card className="border-slate-200/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-500" />
                How I think
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 rounded bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Run <span className="font-medium text-slate-800">7 rule engines</span> on live data (overstock, stockout, demand vs supply, WoW spikes, scheme ROI, distributor rank, growth).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 rounded bg-violet-100 text-violet-700 text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Classify your intent and pull the relevant data slice into context.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-4 w-4 rounded bg-emerald-100 text-emerald-700 text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Llama 3.1 8B answers in executive tone, then the UI overlays structured cards from the same rules.</span>
              </div>
            </CardContent>
          </Card> */}
        </aside>
      </div>
    </div>
  )
}

// =============== MAIN APP SHELL ===============
function App() {
  const [active, setActive] = useState('dashboard')
  const [activeRole, setActiveRole] = useState('S&OP')
  const data = useSopData()

  useEffect(() => {
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY)
    if (savedRole && ROLE_PROFILES[savedRole]) setActiveRole(savedRole)
    const syncRole = (event) => { if (ROLE_PROFILES[event.detail]) setActiveRole(event.detail) }
    window.addEventListener('sop-role-change', syncRole)
    return () => window.removeEventListener('sop-role-change', syncRole)
  }, [])

  useEffect(() => {
    if (!canAccessRootTab(activeRole, active)) setActive('dashboard')
  }, [activeRole, active])

  const changeRole = (role) => {
    setActiveRole(role)
    localStorage.setItem(ROLE_STORAGE_KEY, role)
    window.dispatchEvent(new CustomEvent('sop-role-change', { detail: role }))
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => canAccessRootTab(activeRole, item.id))

  const renderPage = () => {
    if (!canAccessRootTab(activeRole, active)) return <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-amber-600" /><h2 className="mt-3 text-lg font-semibold text-slate-900">Role-restricted workspace</h2><p className="mt-2 text-sm text-slate-600">The {activeRole} role is not authorized for this tab.</p></div>
    switch (active) {
      case 'dashboard': return <DashboardPage data={data} workspaceRole={activeRole} />
      case 'demand': return <DemandPage data={data} activeRole={activeRole} />
      case 'factors': return <DemandFactorsPage data={data} />
      case 'orders': return <OrdersPage data={data} />
      case 'dispatch': return <OrderDispatchPage data={data} />
      case 'supply': return <SupplyPage data={data} />
      case 'inventory': return <InventoryPlanningPage />
      case 'financial': return <FinancialPage data={data} />
      case 'scenario': return <ScenarioPage data={data} />
      case 'chatbot': return <ChatbotPage data={data} />
      default: return <DashboardPage data={data} workspaceRole={activeRole} />
    }
  }

  const activeLabel = NAV_ITEMS.find((n) => n.id === active)?.label || 'Dashboard'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden">
              <Image src={BRAND_LOGO_URL} alt="boAt logo" width={36} height={36} className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 leading-tight">S&OP Suite</h1>
              <p className="text-xs text-slate-500">Planning & Control Tower</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Workspace</p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold">SP</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Srijoy Paul</p>
              <p className="text-xs text-slate-500 truncate">{activeRole}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              <span className="text-slate-400">Imagine Marketing Ltd (boAt)</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-900 font-medium">{activeLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeRole} onValueChange={changeRole}><SelectTrigger className="w-[155px] h-9 bg-slate-50"><SelectValue /></SelectTrigger><SelectContent>{PLANNING_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>
            {/* {data.meta && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 gap-1.5">
                <Database className="h-3.5 w-3.5" />
                {data.meta.rowCount} rows · {data.meta.skuCount}×{data.meta.distributorCount}×{data.meta.weekCount}
              </Badge>
            )} */}
            <div className="relative w-72 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search SKU, distributor, order..." className="pl-9 h-9 bg-slate-50 border-slate-200" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
