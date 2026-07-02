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

// =============== NAVIGATION CONFIG ===============
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'demand', label: 'Demand Planning', icon: TrendingUp },
  { id: 'factors', label: 'Demand Factors', icon: Activity },
  { id: 'orders', label: 'Distributor Orders', icon: Package },
  { id: 'dispatch', label: 'Order vs Dispatch', icon: BarChart3 },
  { id: 'supply', label: 'Supply Planning', icon: Factory },
  { id: 'financial', label: 'Financial Planning', icon: IndianRupee },
  { id: 'scenario', label: 'Scenario Planning', icon: GitBranch },
  { id: 'chatbot', label: 'Chatbot', icon: Bot },
]
const LAVA_LOGO_URL = 'https://p7.hiclipart.com/preview/429/554/533/lava-international-noida-company-business-lava-a97-others.jpg'

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
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const j = (url) => fetch(url).then((r) => r.json())
        const [meta, skus, distributors, regions, weeks, kpis, byWeek, bySku, byDist, byReg, weekly] = await Promise.all([
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
function DashboardPage({ data }) {
  // Build chart data from the live aggregated weekly rows
  const revenueData = useMemo(() => {
    return (data.byWeek || []).map((w, i) => {
      const actual = w.revenue / 1_000_000
      // Plan is a smoothed version of actual (for demo purposes)
      const plan = actual * (0.95 + 0.02 * Math.sin(i / 3))
      return { m: w.key.replace('2025-', ''), plan: +plan.toFixed(2), actual: +actual.toFixed(2) }
    })
  }, [data.byWeek])

  // Category mix from SKU-level aggregation
  const categoryMix = useMemo(() => {
    const palette = {
      'Smartphones - Blaze Series': '#3b82f6',
      'Smartphones - Yuva Series': '#10b981',
      'Smartphones - Premium 5G': '#f59e0b',
      'Feature Phones': '#8b5cf6',
      'Accessories and Wearables': '#ec4899',
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
  const alerts = [
    { sev: 'high', title: 'Stockout risk: Lava Blaze Curve 5G (North hub)', time: '2h ago' },
    { sev: 'medium', title: 'Forecast variance >15% on Accessories and Wearables category', time: '5h ago' },
    { sev: 'low', title: 'New distributor onboarded: South Digital Retail Network', time: '1d ago' },
    { sev: 'medium', title: 'Q3 budget reforecast submitted by finance', time: '2d ago' },
  ]

  return (
    <div>
      <SectionHeader
        title="S&OP Executive Dashboard"
        description={`Integrated view across ${data.meta?.skuCount || 0} SKUs · ${data.meta?.distributorCount || 0} distributors · ${data.meta?.weekCount || 0} weeks`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Filter</Button>
            <Button size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Revenue" value={fmtMoney(k.totalRevenue)} change={`${k.demandWoW >= 0 ? '+' : ''}${k.demandWoW || 0}% WoW`} trend={k.demandWoW >= 0 ? 'up' : 'down'} subtitle={`${data.meta?.weekCount || 0}w window`} icon={IndianRupee} accent="green" />
        <KpiCard title="Gross Margin" value={`${k.gmPct || 0}%`} change={fmtMoney(k.totalGm)} subtitle="value" icon={TrendingUp} accent="blue" />
        <KpiCard title="Primary Sales" value={`${fmtNum((k.totalPrimary || 0) / 1000)}K`} subtitle="units shipped" icon={Package} accent="amber" />
        <KpiCard title="Tertiary Demand" value={`${fmtNum((k.totalDemand || 0) / 1000)}K`} subtitle="units sold-out" icon={Factory} accent="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
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
                <Area type="monotone" dataKey="plan" stroke="#3b82f6" strokeWidth={2} fill="url(#gPlan)" />
                <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fill="url(#gActual)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
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
        </Card>
      </div>

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
                { key: 'rev', label: 'Revenue' },
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

// =============== PAGE: DEMAND PLANNING ===============
// Concepts:
//   • Actual demand   = tertiary (consumer sell-out, what really sold)
//   • Forecast        = secondary (the plan / consensus forecast)
//   • Adjusted        = Forecast × (1 + adj%)   (planner override)
//   • Accuracy (MAPE) = 100 − mean(|forecast − actual| / actual × 100)
//   • Growth          = (recent half actual − earlier half actual) / earlier half
function DemandPage({ data }) {
  const [region, setRegion] = useState('all')
  const [skuFilter, setSkuFilter] = useState('all')
  const [adj, setAdj] = useState([0]) // forecast adjustment % (−30 to +30)
  const adjPct = adj[0]
  const adjMult = 1 + adjPct / 100

  // Filter rows by region + SKU once
  const rows = useMemo(() => {
    return (data.weekly || []).filter((r) => {
      if (region !== 'all' && r.region !== region) return false
      if (skuFilter !== 'all' && r.skuId !== skuFilter) return false
      return true
    })
  }, [data.weekly, region, skuFilter])

  // Weekly rollup → Actual vs Forecast series
  const weeklySeries = useMemo(() => {
    const byWeek = new Map()
    for (const r of rows) {
      if (!byWeek.has(r.weekId)) byWeek.set(r.weekId, { label: r.weekLabel, actual: 0, forecast: 0 })
      const w = byWeek.get(r.weekId)
      w.actual += r.tertiary
      w.forecast += r.secondary
    }
    const arr = Array.from(byWeek.entries()).sort(([a], [b]) => (a > b ? 1 : -1))
    return arr.map(([, v]) => ({
      w: v.label,
      actual: Math.round(v.actual / 1000),
      forecast: Math.round(v.forecast / 1000),
      adjusted: Math.round((v.forecast * adjMult) / 1000),
    }))
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
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} name="Actual" />
              <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} name="Forecast" />
              {adjPct !== 0 && (
                <Line type="monotone" dataKey="adjusted" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 4" dot={false} name="Adjusted" />
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
                placeholder="e.g. prioritize Smartphones - Yuva Series for festive campaign demand"
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
            ? `${selectedDistObj.name} · ${selectedDistObj.region} · Tier ${selectedDistObj.tier} — ordered vs simulated dispatch to surface supply execution gaps.`
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
              {payload.dataSource === 'placed_orders' ? 'Placed orders' : 'Suggested pipeline'}
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
          title="Dispatched (sim.)"
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
              Top {chartData.length} SKUs by ordered quantity — grouped bars (demo dispatch uses supply adequacy rules).
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
                  <Bar dataKey="dispatched" name="Dispatched (sim.)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SKU execution table</CardTitle>
            <CardDescription>
              Gap highlights where supply execution has not yet matched the order book (simulated dispatch for demo).
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
          <p className="font-medium text-slate-800 mb-1">How dispatch is simulated</p>
          <p>
            Fulfilment rate blends last-week <span className="font-medium text-slate-700">primary ÷ secondary</span> (factory→distributor vs distributor→retail)
            as a supply-adequacy signal, a small deterministic variance per SKU, and tier service (A/B/C). This is a POC stand-in for ASN / shipment confirmations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// =============== PAGE: SUPPLY PLANNING ===============
function SupplyPage({ data }) {
  // Plant capacity stays configured; in a real app this would also come from ERP.
  const capacity = [
    { plant: 'Plant A', used: 92, total: 100 },
    { plant: 'Plant B', used: 78, total: 100 },
    { plant: 'Plant C', used: 88, total: 100 },
    { plant: 'Plant D', used: 71, total: 100 },
    { plant: 'Plant E', used: 95, total: 100 },
    { plant: 'Plant F', used: 83, total: 100 },
  ]

  // Inventory on-hand trend = sum of distributorStock across all SKUs and distributors, per week
  const inventoryTrend = useMemo(() => {
    const byWeek = new Map()
    for (const r of data.weekly || []) {
      if (!byWeek.has(r.weekId)) byWeek.set(r.weekId, { w: r.weekLabel, oh: 0 })
      byWeek.get(r.weekId).oh += r.distributorStock
    }
    const rows = Array.from(byWeek.values()).map((v) => ({ ...v, oh: Math.round(v.oh / 1000), target: 900 }))
    return rows
  }, [data.weekly])

  // Supply plan table: SKU × (demand vs primary planned)
  const supplyPlan = useMemo(() => {
    const bySku = new Map()
    for (const r of data.weekly || []) {
      if (!bySku.has(r.skuId)) bySku.set(r.skuId, { name: r.skuName, demand: 0, planned: 0 })
      const e = bySku.get(r.skuId)
      e.demand += r.secondary
      e.planned += r.primary
    }
    const plants = ['Plant A', 'Plant B', 'Plant C', 'Plant D', 'Plant E']
    return Array.from(bySku.entries()).map(([id, e], i) => {
      const cover = Math.round((e.planned / Math.max(e.demand, 1)) * 100)
      const status = cover >= 98 && cover <= 110 ? 'Balanced' : cover > 110 ? 'Surplus' : 'Short'
      return {
        sku: id,
        name: e.name,
        plant: plants[i % plants.length],
        demand: fmtNum(e.demand),
        planned: fmtNum(e.planned),
        cover,
        status,
      }
    })
  }, [data.weekly])

  // KPIs
  const lastWeek = (data.weeks || [])[data.weeks.length - 1]?.weekId
  const lastInv = (data.weekly || []).filter((r) => r.weekId === lastWeek).reduce((s, r) => s + r.distributorStock, 0)
  const lastSales = (data.weekly || []).filter((r) => r.weekId === lastWeek).reduce((s, r) => s + r.secondary, 0)
  const wos = lastSales ? (lastInv / lastSales).toFixed(1) : 0
  const shortCount = supplyPlan.filter((r) => r.status === 'Short').length

  return (
    <div>
      <SectionHeader
        title="Supply Planning"
        description="Capacity, inventory, and procurement alignment to meet consensus demand"
        actions={<Button size="sm" className="gap-2"><Sparkles className="h-4 w-4" />Run MRP</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Capacity Utilization" value="87%" change="+3.2%" subtitle="6 plants" icon={Factory} accent="blue" />
        <KpiCard title="Inventory On Hand" value={`${fmtNum(lastInv / 1000)}K units`} subtitle="distributor stock" icon={Package} accent="green" />
        <KpiCard title="Weeks of Supply" value={`${wos}`} subtitle="target 6.0" icon={TrendingUp} accent="amber" />
        <KpiCard title="SKUs Short" value={`${shortCount}`} subtitle={`of ${supplyPlan.length}`} trend="down" icon={ArrowDownRight} accent="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plant Capacity Utilization</CardTitle>
            <CardDescription>% of nameplate capacity · current week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={capacity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="plant" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="used" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inventory On-Hand vs Target</CardTitle>
            <CardDescription>Network total · 26 week view (000 units)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="oh" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} name="On Hand" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Supply Plan by SKU</CardTitle>
          <CardDescription>Production schedule (primary) vs demand coverage (secondary)</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Product' },
              { key: 'plant', label: 'Plant' },
              { key: 'demand', label: 'Demand' },
              { key: 'planned', label: 'Planned' },
              { key: 'cover', label: 'Coverage' },
              { key: 'status', label: 'Status' },
            ]}
            rows={supplyPlan}
            renderCell={(col, row) => {
              if (col.key === 'status') {
                const map = { Balanced: 'bg-emerald-50 text-emerald-700', Short: 'bg-rose-50 text-rose-700', Surplus: 'bg-amber-50 text-amber-700' }
                return <Badge variant="secondary" className={`${map[row.status]} hover:${map[row.status]}`}>{row.status}</Badge>
              }
              if (col.key === 'cover') {
                return (
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(row.cover, 120)} className="h-1.5 w-20" />
                    <span className="text-xs text-slate-600 font-medium">{row.cover}%</span>
                  </div>
                )
              }
              return row[col.key]
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =============== PAGE: FINANCIAL PLANNING ===============
function FinancialPage({ data }) {
  const [demandUplift, setDemandUplift] = useState([0])
  const [priceShift, setPriceShift] = useState([0])
  const [costShift, setCostShift] = useState([0])
  const [schemePerUnit, setSchemePerUnit] = useState([350])
  const [logisticsPerUnit, setLogisticsPerUnit] = useState([150])

  const businessCategoryMap = {
    'Smartphones - Blaze Series': 'Smartphone',
    'Smartphones - Yuva Series': 'Smartphone',
    'Smartphones - Premium 5G': 'Premium 5G',
    'Feature Phones': 'Feature',
    'Accessories and Wearables': 'Accessories',
  }
  const channelByDistributor = {
    'DST-001': 'national',
    'DST-002': 'distributor',
    'DST-003': 'pilot',
    'DST-004': 'national',
    'DST-005': 'distributor',
  }
  const segmentByDistributor = {
    'DST-001': 'direct dealer',
    'DST-002': 'distributor',
    'DST-003': 'modern trade',
    'DST-004': 'e-commerce',
    'DST-005': 'distributor',
  }
  const collectionProfiles = {
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
      weekMap.set(w.weekId, { w: w.label, revenue: 0, profit: 0, netRevenue: 0 })
    }
    for (const r of financialRows) {
      if (!weekMap.has(r.weekId)) continue
      const row = weekMap.get(r.weekId)
      row.revenue += r.revenue
      row.profit += r.grossProfit
      row.netRevenue += r.netRevenue
    }
    return (data.weeks || []).map((w) => {
      const row = weekMap.get(w.weekId) || { w: w.label, revenue: 0, profit: 0, netRevenue: 0 }
      return {
        w: row.w,
        revenue: +(row.revenue / 1_000_000).toFixed(2),
        profit: +(row.profit / 1_000_000).toFixed(2),
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
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="netRevenue" stroke="#10b981" strokeWidth={2.5} dot={false} name="Net Revenue" />
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
            <CardDescription>FP / SP / Accessories / Moto-FP</CardDescription>
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

  // Use 6-month revenue as the quarter baseline (2 quarters worth)
  const totalRev = (data.kpis?.totalRevenue || 11_400_000_000) / 1_000_000  // million INR across 6 months
  const totalGm = (data.kpis?.totalGm || 2_800_000_000) / 1_000_000
  const quarterlyBaseline = totalRev / 2   // one quarter = 3 months
  const quarterlyGmBase = totalGm / 2

  const scenarios = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => {
    const factor = 1 + (demand[0] / 100) + (i * 0.02)
    const rev = +(quarterlyBaseline * factor).toFixed(1)
    const cogFactor = 1 + (cost[0] / 100)
    const cog = +((quarterlyBaseline - quarterlyGmBase) * cogFactor * (1 + i * 0.015)).toFixed(1)
    return { q, baseline: +(quarterlyBaseline * (1 + i * 0.02)).toFixed(1), scenario: rev, gm: +(rev - cog).toFixed(1) }
  })

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
            rows={[
              { name: 'Aggressive Growth Q4', owner: 'S. Chen', rev: `+${fmtMoney(18.2 * 1_000_000 * DEMO_INR_PER_USD)}`, gm: `+${fmtMoney(4.1 * 1_000_000 * DEMO_INR_PER_USD)}`, updated: '2d ago', status: 'Active' },
              { name: 'Supplier Cost Spike', owner: 'M. Patel', rev: `-${fmtMoney(2.4 * 1_000_000 * DEMO_INR_PER_USD)}`, gm: `-${fmtMoney(8.6 * 1_000_000 * DEMO_INR_PER_USD)}`, updated: '5d ago', status: 'Draft' },
              { name: 'New Line Launch Q3', owner: 'R. Alvarez', rev: `+${fmtMoney(9.1 * 1_000_000 * DEMO_INR_PER_USD)}`, gm: `+${fmtMoney(2.8 * 1_000_000 * DEMO_INR_PER_USD)}`, updated: '1w ago', status: 'Approved' },
              { name: 'Recession Downside', owner: 'J. Kim', rev: `-${fmtMoney(14.8 * 1_000_000 * DEMO_INR_PER_USD)}`, gm: `-${fmtMoney(5.2 * 1_000_000 * DEMO_INR_PER_USD)}`, updated: '2w ago', status: 'Archived' },
            ]}
            renderCell={(col, row) => {
              if (col.key === 'status') {
                const map = { Active: 'bg-blue-50 text-blue-700', Draft: 'bg-slate-100 text-slate-700', Approved: 'bg-emerald-50 text-emerald-700', Archived: 'bg-slate-100 text-slate-500' }
                return <Badge variant="secondary" className={`${map[row.status]} hover:${map[row.status]}`}>{row.status}</Badge>
              }
              if (col.key === 'rev' || col.key === 'gm') {
                const pos = row[col.key].startsWith('+')
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
  // Featured SKUs for dropdown selection
  const featuredSkus = [
    { id: 'SKU-30220', name: 'Lava Agni 3 5G 8GB/256GB', category: 'Smartphones - Premium 5G', plc: 'Growth', baseDemand: 480 },
    { id: 'SKU-10842', name: 'Lava Blaze Curve 5G 8GB/128GB (Hero SKU)', category: 'Smartphones - Blaze Series', plc: 'Mature', baseDemand: 760 },
    { id: 'SKU-40118', name: 'Lava A3 Power Feature Phone', category: 'Feature Phones', plc: 'Decline', baseDemand: 920 },
  ]

  const [selectedSku, setSelectedSku] = useState(featuredSkus[0].id)
  const [factors, setFactors] = useState({
    plc: true,
    seasonality: true,
    promotions: true,
    location: false,
  })

  const currentSku = featuredSkus.find(s => s.id === selectedSku)

  // PLC multipliers
  const plcMultipliers = {
    'New': 1.2,
    'Growth': 1.5,
    'Mature': 1.0,
    'Decline': 0.7,
  }

  // Seasonality patterns by category (12 months)
  const seasonalityPatterns = {
    'Smartphones - Premium 5G': [0.92, 0.90, 0.95, 1.00, 1.03, 1.05, 1.08, 1.10, 1.18, 1.32, 1.38, 1.24],
    'Smartphones - Blaze Series': [0.94, 0.92, 0.96, 1.00, 1.02, 1.06, 1.10, 1.14, 1.22, 1.30, 1.34, 1.20],
    'Smartphones - Yuva Series': [0.96, 0.95, 0.98, 1.00, 1.03, 1.05, 1.08, 1.11, 1.16, 1.24, 1.28, 1.14],
    'Feature Phones': [1.08, 1.06, 1.02, 0.98, 0.94, 0.92, 0.90, 0.92, 0.98, 1.08, 1.16, 1.18],
    'Accessories and Wearables': [0.90, 0.88, 0.92, 0.98, 1.02, 1.08, 1.12, 1.18, 1.24, 1.36, 1.42, 1.26],
  }

  // Promotion schedule (weeks with active promotions)
  const promotionWeeks = [8, 9, 15, 16, 22, 23] // Roughly 3 campaigns per 6 months
  const promotionUplift = 1.4 // +40%

  // Regional multipliers
  const regionMultipliers = {
    'North': {
      'Smartphones - Premium 5G': 1.12,
      'Smartphones - Blaze Series': 1.08,
      'Smartphones - Yuva Series': 0.96,
      'Feature Phones': 1.05,
      'Accessories and Wearables': 1.10,
    },
    'South': {
      'Smartphones - Premium 5G': 0.94,
      'Smartphones - Blaze Series': 0.98,
      'Smartphones - Yuva Series': 1.14,
      'Feature Phones': 0.92,
      'Accessories and Wearables': 1.02,
    },
    'West': {
      'Smartphones - Premium 5G': 1.04,
      'Smartphones - Blaze Series': 1.06,
      'Smartphones - Yuva Series': 1.00,
      'Feature Phones': 0.98,
      'Accessories and Wearables': 1.08,
    },
  }

  // Generate 26 weeks of demand data with factors
  const generateDemandData = () => {
    const weeks = []
    const baseDemand = currentSku.baseDemand

    for (let i = 0; i < 26; i++) {
      const weekId = `W${(i + 7).toString().padStart(2, '0')}`
      const monthIndex = Math.floor((i + 6) / 4) % 12 // Map to month

      let demand = baseDemand

      // Apply PLC
      let plcAdjusted = demand
      if (factors.plc) {
        plcAdjusted = demand * plcMultipliers[currentSku.plc]
      }

      // Apply Seasonality
      let seasonalAdjusted = plcAdjusted
      if (factors.seasonality) {
        const seasonalFactor = seasonalityPatterns[currentSku.category][monthIndex]
        seasonalAdjusted = plcAdjusted * seasonalFactor
      }

      // Apply Promotions
      let promoAdjusted = seasonalAdjusted
      if (factors.promotions && promotionWeeks.includes(i)) {
        promoAdjusted = seasonalAdjusted * promotionUplift
      }

      // Apply Location (using North as default)
      let locationAdjusted = promoAdjusted
      if (factors.location) {
        locationAdjusted = promoAdjusted * regionMultipliers['North'][currentSku.category]
      }

      weeks.push({
        week: weekId,
        base: Math.round(demand),
        adjusted: Math.round(locationAdjusted),
        plcOnly: Math.round(plcAdjusted),
        withSeasonal: Math.round(seasonalAdjusted),
        hasPromo: promotionWeeks.includes(i),
      })
    }

    return weeks
  }

  const demandData = generateDemandData()

  // Competitor mock data
  const competitorData = [
    { name: 'Lava', value: currentSku.baseDemand * 1.2, color: '#3b82f6' },
    { name: 'Samsung', value: currentSku.baseDemand * 1.1, color: '#f59e0b' },
    { name: 'Redmi', value: currentSku.baseDemand * 0.9, color: '#8b5cf6' },
  ]

  // Calculate impact percentages
  const calculateImpact = () => {
    const base = demandData.reduce((sum, d) => sum + d.base, 0)
    const adjusted = demandData.reduce((sum, d) => sum + d.adjusted, 0)
    const diff = ((adjusted - base) / base * 100).toFixed(1)
    return { base, adjusted, diff }
  }

  const impact = calculateImpact()

  const toggleFactor = (factor) => {
    setFactors(prev => ({ ...prev, [factor]: !prev[factor] }))
  }

  const plcColors = {
    'New': 'bg-cyan-50 text-cyan-700 border-cyan-300',
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
        <Badge className={`${plcColors[currentSku.plc]} text-xs font-semibold px-3 py-1.5`}>
          {currentSku.plc} Stage · {(plcMultipliers[currentSku.plc] * 100).toFixed(0)}% multiplier
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
              <div className="text-2xl font-bold text-slate-900">{currentSku.baseDemand.toLocaleString()}</div>
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
                    <div className="text-xs text-slate-500">{currentSku.plc} · {(plcMultipliers[currentSku.plc] * 100).toFixed(0)}% impact</div>
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
                    <div className="text-xs text-slate-500">{currentSku.category} seasonal pattern</div>
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
              <div className="text-2xl font-bold text-slate-900">{impact.base.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Adjusted Demand</div>
              <div className="text-2xl font-bold text-blue-600">{impact.adjusted.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Total Impact</div>
              <div className={`text-2xl font-bold ${impact.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {impact.diff >= 0 ? '+' : ''}{impact.diff}%
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
                  {factors.plc ? `${((plcMultipliers[currentSku.plc] - 1) * 100).toFixed(0)}%` : '—'}
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
                  {factors.location ? `${((regionMultipliers['North'][currentSku.category] - 1) * 100).toFixed(0)}%` : '—'}
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
                <span>Leading in {currentSku.category} category</span>
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
            <CardDescription>How demand varies across different regions for {currentSku.category} products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(regionMultipliers).map(([region, multipliers]) => {
                const multiplier = multipliers[currentSku.category]
                const adjustedDemand = Math.round(currentSku.baseDemand * multiplier)
                const diff = ((multiplier - 1) * 100).toFixed(0)
                return (
                  <div key={region} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-sm font-semibold text-slate-900 mb-2">{region}</div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">{adjustedDemand.toLocaleString()}</div>
                    <div className={`text-sm font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff >= 0 ? '+' : ''}{diff}% vs baseline
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
                    <Image src={LAVA_LOGO_URL} alt="Lava Mobiles logo" width={36} height={36} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Lava Planning Intelligence</div>
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
                      <Image src={LAVA_LOGO_URL} alt="Lava Mobiles logo" width={32} height={32} className="h-full w-full object-contain" />
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
  const data = useSopData()

  const renderPage = () => {
    switch (active) {
      case 'dashboard': return <DashboardPage data={data} />
      case 'demand': return <DemandPage data={data} />
      case 'factors': return <DemandFactorsPage data={data} />
      case 'orders': return <OrdersPage data={data} />
      case 'dispatch': return <OrderDispatchPage data={data} />
      case 'supply': return <SupplyPage data={data} />
      case 'financial': return <FinancialPage data={data} />
      case 'scenario': return <ScenarioPage data={data} />
      case 'chatbot': return <ChatbotPage data={data} />
      default: return <DashboardPage data={data} />
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
              <Image src={LAVA_LOGO_URL} alt="Lava Mobiles logo" width={36} height={36} className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 leading-tight">Lava S&OP Suite</h1>
              <p className="text-xs text-slate-500">Planning & Control Tower</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Workspace</p>
          {NAV_ITEMS.map((item) => {
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
              <p className="text-xs text-slate-500 truncate">Demand Planner</p>
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
              <span className="text-slate-400">Lava Mobiles</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-900 font-medium">{activeLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
