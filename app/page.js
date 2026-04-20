'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Factory,
  DollarSign,
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
} from 'lucide-react'
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

// =============== NAVIGATION CONFIG ===============
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'demand', label: 'Demand Planning', icon: TrendingUp },
  { id: 'orders', label: 'Distributor Orders', icon: Package },
  { id: 'supply', label: 'Supply Planning', icon: Factory },
  { id: 'financial', label: 'Financial Planning', icon: DollarSign },
  { id: 'scenario', label: 'Scenario Planning', icon: GitBranch },
  { id: 'chatbot', label: 'Chatbot', icon: Bot },
]

// =============== CENTRAL DATA HOOK ===============
// Pulls the generated FMCG dataset from /api/data/* and caches it in state.
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
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0))
const fmtMoney = (n, digits = 1) => {
  const v = n || 0
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(digits)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(digits)}K`
  return `$${v.toFixed(2)}`
}

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
    const palette = { Beverages: '#3b82f6', Snacks: '#10b981', Dairy: '#f59e0b', Frozen: '#8b5cf6', 'Personal Care': '#ec4899' }
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
        return { sku: r.key, name: s.name, category: s.category, rev: fmtMoney(r.revenue), growth, status }
      })
      .sort((a, b) => parseFloat(b.rev.replace(/[^\d.-]/g, '')) - parseFloat(a.rev.replace(/[^\d.-]/g, '')))
      .slice(0, 5)
  }, [data.bySku, data.skus, data.weekly, data.weeks])

  const k = data.kpis || {}
  const alerts = [
    { sev: 'high', title: 'Stockout risk: SKU-10842 (Midwest DC)', time: '2h ago' },
    { sev: 'medium', title: 'Forecast variance >15% on Dairy category', time: '5h ago' },
    { sev: 'low', title: 'New distributor onboarded: NorthStar Foods', time: '1d ago' },
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
        <KpiCard title="Total Revenue" value={fmtMoney(k.totalRevenue)} change={`${k.demandWoW >= 0 ? '+' : ''}${k.demandWoW || 0}% WoW`} trend={k.demandWoW >= 0 ? 'up' : 'down'} subtitle={`${data.meta?.weekCount || 0}w window`} icon={DollarSign} accent="green" />
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
                <CardDescription>Weekly consensus plan tracking ($M) · live data</CardDescription>
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
function DemandPage({ data }) {
  const [region, setRegion] = useState('all')

  // Build per-week forecast view from weekly rows, filtered by region
  const forecast = useMemo(() => {
    const rows = (data.weekly || []).filter((r) => region === 'all' || r.region === region)
    const byWeek = new Map()
    for (const r of rows) {
      if (!byWeek.has(r.weekId)) byWeek.set(r.weekId, { label: r.weekLabel, tertiary: 0, secondary: 0, primary: 0 })
      const w = byWeek.get(r.weekId)
      w.tertiary += r.tertiary
      w.secondary += r.secondary
      w.primary += r.primary
    }
    const arr = Array.from(byWeek.entries()).sort(([a], [b]) => (a > b ? 1 : -1))
    return arr.map(([, v], i) => ({
      w: v.label,
      baseline: Math.round(v.tertiary / 1000),          // baseline = tertiary (sell-out)
      forecast: Math.round(v.secondary / 1000),         // consensus = secondary
      actual: i < arr.length - 4 ? Math.round(v.primary / 1000) : null, // actual = primary (last 4 wk still open)
    }))
  }, [data.weekly, region])

  // SKU-level detail table (last 4-week consensus vs baseline)
  const skuDetail = useMemo(() => {
    const rows = (data.weekly || []).filter((r) => region === 'all' || r.region === region)
    const byKey = new Map()
    for (const r of rows) {
      if (!byKey.has(r.skuId)) byKey.set(r.skuId, { name: r.skuName, tertiary: 0, secondary: 0, cnt: 0, recent: 0, earlier: 0, i: 0 })
      const e = byKey.get(r.skuId)
      e.tertiary += r.tertiary
      e.secondary += r.secondary
      e.cnt += 1
    }
    // Split halves for trend
    for (const r of rows) {
      const e = byKey.get(r.skuId)
      if (e.i < e.cnt / 2) e.earlier += r.secondary
      else e.recent += r.secondary
      e.i += 1
    }
    return Array.from(byKey.entries()).map(([id, e]) => {
      const growth = e.earlier ? ((e.recent - e.earlier) / e.earlier) * 100 : 0
      const accuracy = Math.max(70, Math.min(99, Math.round(100 - Math.abs((e.secondary - e.tertiary) / Math.max(e.tertiary, 1)) * 100)))
      const trend = growth > 2 ? '↗' : growth < -2 ? '↘' : '→'
      return {
        sku: id,
        name: e.name,
        baseline: fmtNum(e.tertiary),
        consensus: fmtNum(e.secondary),
        accuracy,
        trend,
      }
    }).sort((a, b) => parseFloat(b.consensus.replace(/,/g, '')) - parseFloat(a.consensus.replace(/,/g, '')))
  }, [data.weekly, region])

  // KPIs
  const totalForecast = forecast.reduce((s, r) => s + (r.forecast || 0), 0) // already in K units
  const meanAcc = skuDetail.length ? Math.round(skuDetail.reduce((s, r) => s + r.accuracy, 0) / skuDetail.length) : 0
  const biasRows = (data.weekly || []).filter((r) => region === 'all' || r.region === region)
  const biasTotalS = biasRows.reduce((s, r) => s + r.secondary, 0)
  const biasTotalT = biasRows.reduce((s, r) => s + r.tertiary, 0)
  const biasPct = biasTotalT ? ((biasTotalS - biasTotalT) / biasTotalT) * 100 : 0

  return (
    <div>
      <SectionHeader
        title="Demand Planning"
        description="Consensus forecast built from tertiary sell-out, secondary sell-in, and statistical baseline"
        actions={
          <>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {(data.regions || []).map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2"><Sparkles className="h-4 w-4" />Re-forecast</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Forecast Accuracy" value={`${meanAcc}%`} subtitle={`${skuDetail.length} SKUs`} icon={TrendingUp} accent="blue" />
        <KpiCard title="Forecast Bias" value={`${biasPct >= 0 ? '+' : ''}${biasPct.toFixed(1)}%`} trend={biasPct >= 0 ? 'up' : 'down'} subtitle={biasPct >= 0 ? 'slight over-forecast' : 'slight under-forecast'} icon={GitBranch} accent="amber" />
        <KpiCard title={`Total Forecast (${forecast.length}W)`} value={`${fmtNum(totalForecast)}K units`} icon={Package} accent="green" />
        <KpiCard title="SKUs in Scope" value={`${skuDetail.length}`} subtitle={region === 'all' ? 'all regions' : region} icon={Plus} accent="purple" />
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Demand Signals</CardTitle>
          <CardDescription>Tertiary (baseline) · Secondary (consensus) · Primary (actual) · 000 units</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Forecast Detail by SKU</CardTitle>
          <CardDescription>{skuDetail.length} SKUs · {region === 'all' ? 'all regions' : region}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Product' },
              { key: 'baseline', label: 'Baseline' },
              { key: 'consensus', label: 'Consensus' },
              { key: 'accuracy', label: 'Accuracy' },
              { key: 'trend', label: 'Trend' },
            ]}
            rows={skuDetail}
            renderCell={(col, row) => {
              if (col.key === 'accuracy') {
                return (
                  <div className="flex items-center gap-2">
                    <Progress value={row.accuracy} className="h-1.5 w-20" />
                    <span className="text-xs text-slate-600 font-medium">{row.accuracy}%</span>
                  </div>
                )
              }
              if (col.key === 'trend') {
                const color = row.trend === '↗' ? 'text-emerald-600' : row.trend === '↘' ? 'text-rose-600' : 'text-slate-500'
                return <span className={`text-lg font-semibold ${color}`}>{row.trend}</span>
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
function OrdersPage({ data }) {
  // Generate orders from last 4 weeks of primary shipments × distributors × top SKUs
  const orders = useMemo(() => {
    const weekly = data.weekly || []
    const weeks = data.weeks || []
    if (!weeks.length) return []
    const lastWeeks = weeks.slice(-4).map((w) => w.weekId)
    // Roll up primary + revenue per (distributor, weekId)
    const m = new Map()
    for (const r of weekly) {
      if (!lastWeeks.includes(r.weekId)) continue
      const k = `${r.distributorId}|${r.weekId}`
      if (!m.has(k)) {
        m.set(k, { distributorId: r.distributorId, dist: r.distributor, region: r.region, weekId: r.weekId, weekStart: r.weekStart, items: 0, value: 0 })
      }
      const o = m.get(k)
      o.items += r.primary
      o.value += r.revenue
    }
    const statuses = ['Delivered', 'In Transit', 'Approved', 'Pending']
    return Array.from(m.values())
      .sort((a, b) => (a.weekId < b.weekId ? 1 : -1))
      .map((o, i) => ({
        id: `ORD-${48200 + i}`,
        dist: o.dist,
        region: o.region,
        items: o.items,
        value: fmtMoney(o.value),
        eta: o.weekStart,
        status: statuses[Math.min(Math.floor(i / 5), 3)], // most recent = pending, oldest = delivered
      }))
  }, [data.weekly, data.weeks])

  const statusMap = {
    Pending: 'bg-amber-50 text-amber-700',
    Approved: 'bg-blue-50 text-blue-700',
    'In Transit': 'bg-violet-50 text-violet-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    Backorder: 'bg-rose-50 text-rose-700',
  }

  // KPIs derived from live data
  const openOrders = orders.filter((o) => o.status !== 'Delivered').length
  const totalValue = (data.weekly || []).slice(-(data.weekly?.length || 0)).reduce((s, r) => s + r.revenue, 0)
  const byDistRows = data.byDistributor || []
  const topDistCount = byDistRows.length

  return (
    <div>
      <SectionHeader
        title="Distributor Orders"
        description={`Live orders from ${topDistCount} distributors across ${data.regions?.length || 0} regions`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Filter</Button>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New Order</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Open Orders" value={fmtNum(openOrders)} subtitle={`of ${orders.length} last 4w`} icon={Package} accent="blue" />
        <KpiCard title="Order Value" value={fmtMoney(totalValue)} subtitle={`${data.meta?.weekCount || 0}w window`} icon={DollarSign} accent="green" />
        <KpiCard title="Distributors" value={`${topDistCount}`} subtitle="active network" icon={TrendingUp} accent="purple" />
        <KpiCard title="Regions" value={`${data.regions?.length || 0}`} subtitle="coverage" icon={Factory} accent="amber" />
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Distributor</CardTitle>
          <CardDescription>Total revenue contribution · 6 month window</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={(byDistRows || []).map((r) => {
              const d = (data.distributors || []).find((x) => x.id === r.key)
              return { name: d?.name || r.key, value: +(r.revenue / 1_000_000).toFixed(2), region: d?.region }
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => [`$${v}M`, 'Revenue']} />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <CardDescription>Showing {orders.length} of {orders.length} orders (last 4 weeks)</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search order or distributor..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'id', label: 'Order ID' },
              { key: 'dist', label: 'Distributor' },
              { key: 'region', label: 'Region' },
              { key: 'items', label: 'Items' },
              { key: 'value', label: 'Value' },
              { key: 'eta', label: 'Week' },
              { key: 'status', label: 'Status' },
            ]}
            rows={orders.slice(0, 10)}
            renderCell={(col, row) => {
              if (col.key === 'status') {
                return <Badge variant="secondary" className={`${statusMap[row.status]} hover:${statusMap[row.status]}`}>{row.status}</Badge>
              }
              if (col.key === 'id') return <span className="font-mono text-xs text-slate-700">{row.id}</span>
              if (col.key === 'value') return <span className="font-medium">{row.value}</span>
              if (col.key === 'items') return fmtNum(row.items)
              return row[col.key]
            }}
          />
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
  // P&L by week (grouped into "months" of 4 weeks)
  const pnl = useMemo(() => {
    const byWeek = data.byWeek || []
    const bucket = []
    // Aggregate every 4 weeks into one bar
    for (let i = 0; i < byWeek.length; i += 4) {
      const chunk = byWeek.slice(i, i + 4)
      if (!chunk.length) continue
      const revenue = chunk.reduce((s, r) => s + r.revenue, 0) / 1_000_000
      const gm = chunk.reduce((s, r) => s + r.gm, 0) / 1_000_000
      const cogs = revenue - gm
      bucket.push({
        m: chunk[0].key.replace('2025-', ''),
        revenue: +revenue.toFixed(2),
        cogs: +cogs.toFixed(2),
        gm: +gm.toFixed(2),
      })
    }
    return bucket
  }, [data.byWeek])

  // Budget vs Actual by category
  const byCat = useMemo(() => {
    const skuMap = Object.fromEntries((data.skus || []).map((s) => [s.id, s.category]))
    const totals = {}
    for (const r of data.bySku || []) {
      const cat = skuMap[r.key] || 'Other'
      totals[cat] = (totals[cat] || 0) + r.revenue
    }
    // Pretend budget = 95% of actual with a deterministic skew per category
    const skew = { Beverages: 1.04, Snacks: 1.03, Dairy: 0.94, Frozen: 1.03, 'Personal Care': 1.00 }
    return Object.entries(totals).map(([cat, actual]) => {
      const attain = skew[cat] || 1
      const budget = actual / attain
      const variance = actual - budget
      return {
        cat,
        budget: fmtMoney(budget),
        actual: fmtMoney(actual),
        var: `${variance >= 0 ? '+' : '-'}${fmtMoney(Math.abs(variance))}`,
        attain: Math.round(attain * 100),
      }
    })
  }, [data.bySku, data.skus])

  const k = data.kpis || {}

  return (
    <div>
      <SectionHeader
        title="Financial Planning"
        description="Rolling financial forecast aligned with the S&OP cycle"
        actions={
          <>
            <Select defaultValue="fy25">
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fy25">FY 2025</SelectItem>
                <SelectItem value="fy24">FY 2024</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Revenue (6mo)" value={fmtMoney(k.totalRevenue)} subtitle="sell-in basis" icon={DollarSign} accent="green" />
        <KpiCard title="Gross Margin %" value={`${k.gmPct || 0}%`} subtitle={fmtMoney(k.totalGm)} icon={TrendingUp} accent="blue" />
        <KpiCard title="Avg Weekly Rev" value={fmtMoney((k.totalRevenue || 0) / (data.meta?.weekCount || 1))} icon={TrendingUp} accent="purple" />
        <KpiCard title="SKUs Tracked" value={`${data.meta?.skuCount || 0}`} subtitle={`${data.meta?.rowCount || 0} fact rows`} icon={Package} accent="amber" />
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">P&L Summary ($M)</CardTitle>
          <CardDescription>Revenue · COGS · Gross Margin by 4-week bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gm" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget vs Actual by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'cat', label: 'Category' },
              { key: 'budget', label: 'Budget' },
              { key: 'actual', label: 'Actual' },
              { key: 'var', label: 'Variance' },
              { key: 'attain', label: 'Attainment' },
            ]}
            rows={byCat}
            renderCell={(col, row) => {
              if (col.key === 'var') {
                const pos = row.var.startsWith('+')
                const neg = row.var.startsWith('-')
                return <span className={pos ? 'text-emerald-600 font-medium' : neg ? 'text-rose-600 font-medium' : 'text-slate-500'}>{row.var}</span>
              }
              if (col.key === 'attain') {
                return (
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(row.attain, 100)} className="h-1.5 w-20" />
                    <span className="text-xs text-slate-600 font-medium">{row.attain}%</span>
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

// =============== PAGE: SCENARIO PLANNING ===============
function ScenarioPage({ data }) {
  const [demand, setDemand] = useState([5])
  const [cost, setCost] = useState([0])
  const [capacity, setCapacity] = useState([0])

  // Use 6-month revenue as the quarter baseline (2 quarters worth)
  const totalRev = (data.kpis?.totalRevenue || 66_000_000) / 1_000_000  // in $M across 6 months
  const totalGm = (data.kpis?.totalGm || 27_000_000) / 1_000_000
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
              <CardDescription>Revenue projection by quarter ($M)</CardDescription>
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
              { name: 'Aggressive Growth Q4', owner: 'S. Chen', rev: '+$18.2M', gm: '+$4.1M', updated: '2d ago', status: 'Active' },
              { name: 'Supplier Cost Spike', owner: 'M. Patel', rev: '-$2.4M', gm: '-$8.6M', updated: '5d ago', status: 'Draft' },
              { name: 'New Line Launch Q3', owner: 'R. Alvarez', rev: '+$9.1M', gm: '+$2.8M', updated: '1w ago', status: 'Approved' },
              { name: 'Recession Downside', owner: 'J. Kim', rev: '-$14.8M', gm: '-$5.2M', updated: '2w ago', status: 'Archived' },
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

// =============== PAGE: CHATBOT ===============
function ChatbotPage({ data }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your S&OP planning assistant. Ask me anything about your forecast, supply plan, or financials." },
  ])
  const [input, setInput] = useState('')

  const suggestions = [
    'Total revenue across all distributors?',
    'Which SKU has the highest growth?',
    'Forecast bias this period?',
    'Top distributor by volume',
  ]

  const respond = (q) => {
    const k = data.kpis || {}
    const lower = q.toLowerCase()
    if (lower.includes('revenue') || lower.includes('sales')) {
      return `Across the ${data.meta?.weekCount || 0}-week window, total sell-in revenue is ${fmtMoney(k.totalRevenue)} with a ${k.gmPct}% gross margin ( ${fmtMoney(k.totalGm)} GM value).`
    }
    if (lower.includes('growth') || lower.includes('best') || lower.includes('highest')) {
      const bySku = data.bySku || []
      const top = [...bySku].sort((a, b) => b.revenue - a.revenue)[0]
      const name = (data.skus || []).find((s) => s.id === top?.key)?.name
      return `Top SKU by revenue is ${top?.key} – ${name || ''} at ${fmtMoney(top?.revenue || 0)}.`
    }
    if (lower.includes('bias') || lower.includes('forecast')) {
      const s = (data.weekly || []).reduce((a, b) => a + b.secondary, 0)
      const t = (data.weekly || []).reduce((a, b) => a + b.tertiary, 0)
      const bias = t ? ((s - t) / t) * 100 : 0
      return `Current forecast bias (secondary vs tertiary) is ${bias >= 0 ? '+' : ''}${bias.toFixed(1)}%. ${bias > 1 ? 'Slight over-forecast.' : bias < -1 ? 'Slight under-forecast.' : 'Well balanced.'}`
    }
    if (lower.includes('distributor')) {
      const byDist = data.byDistributor || []
      const top = [...byDist].sort((a, b) => b.revenue - a.revenue)[0]
      const name = (data.distributors || []).find((d) => d.id === top?.key)?.name
      return `Top distributor is ${name} contributing ${fmtMoney(top?.revenue || 0)} over ${data.meta?.weekCount || 0} weeks.`
    }
    return `I see ${data.meta?.skuCount || 0} SKUs across ${data.meta?.distributorCount || 0} distributors and ${data.meta?.regionCount || 0} regions. Total revenue is ${fmtMoney(k.totalRevenue)}. Ask me about growth, bias, or distributors for more detail.`
  }

  const handleSend = (text) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setInput('')
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', text: respond(msg) }])
    }, 400)
  }

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        title="Planning Assistant"
        description="Ask questions about your S&OP plan in natural language"
      />

      <Card className="border-slate-200/70 shadow-sm flex-1 flex flex-col min-h-[560px]">
        <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                {m.text}
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <CircleUser className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {messages.length === 1 && (
            <div className="pt-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Try asking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => handleSend(s)} className="text-left text-sm px-3 py-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-slate-700">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-slate-200 p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about forecasts, supply, financials..."
              className="flex-1"
            />
            <Button type="submit" className="gap-2"><Send className="h-4 w-4" />Send</Button>
          </form>
          <p className="text-xs text-slate-400 mt-2">Demo responses · connect an LLM to enable live answers.</p>
        </div>
      </Card>
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
      case 'orders': return <OrdersPage data={data} />
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
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 leading-tight">S&OP Suite</h1>
              <p className="text-xs text-slate-500">Enterprise Planning</p>
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
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
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold">SC</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Sarah Chen</p>
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
              <span className="text-slate-400">S&OP</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-900 font-medium">{activeLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.meta && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 gap-1.5">
                <Database className="h-3.5 w-3.5" />
                {data.meta.rowCount} rows · {data.meta.skuCount}×{data.meta.distributorCount}×{data.meta.weekCount}
              </Badge>
            )}
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
