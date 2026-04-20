'use client'

import { useState } from 'react'
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
function DashboardPage() {
  const revenueData = [
    { m: 'Jan', plan: 42, actual: 40 },
    { m: 'Feb', plan: 45, actual: 47 },
    { m: 'Mar', plan: 48, actual: 46 },
    { m: 'Apr', plan: 52, actual: 54 },
    { m: 'May', plan: 55, actual: 58 },
    { m: 'Jun', plan: 60, actual: 62 },
    { m: 'Jul', plan: 63, actual: 61 },
    { m: 'Aug', plan: 66, actual: 68 },
  ]
  const categoryMix = [
    { name: 'Beverages', value: 34, color: '#3b82f6' },
    { name: 'Snacks', value: 26, color: '#10b981' },
    { name: 'Dairy', value: 20, color: '#f59e0b' },
    { name: 'Frozen', value: 12, color: '#8b5cf6' },
    { name: 'Other', value: 8, color: '#64748b' },
  ]
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
        description="Integrated view across demand, supply, and financial plans · Aug 2025 cycle"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Filter</Button>
            <Button size="sm" className="gap-2"><Download className="h-4 w-4" />Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Forecast Accuracy" value="92.4%" change="+1.8%" subtitle="MAPE 7.6%" icon={TrendingUp} accent="blue" />
        <KpiCard title="Plan Attainment" value="$68.2M" change="+4.3%" subtitle="vs plan $66M" icon={DollarSign} accent="green" />
        <KpiCard title="Open Orders" value="1,284" change="-2.1%" trend="down" subtitle="342 distributors" icon={Package} accent="amber" />
        <KpiCard title="Capacity Utilization" value="87%" change="+3.2%" subtitle="6 plants · 14 lines" icon={Factory} accent="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue: Plan vs Actual</CardTitle>
                <CardDescription>Monthly consensus plan tracking ($M)</CardDescription>
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
                <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
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
            <CardDescription>Volume share YTD</CardDescription>
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
            <CardDescription>Last 30 days · all regions</CardDescription>
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
              rows={[
                { sku: 'SKU-10842', name: 'Sparkling Water 500ml', category: 'Beverages', rev: '$2.41M', growth: '+12.4%', status: 'On Track' },
                { sku: 'SKU-20591', name: 'Organic Granola 340g', category: 'Snacks', rev: '$1.86M', growth: '+8.7%', status: 'On Track' },
                { sku: 'SKU-30220', name: 'Greek Yogurt Multipack', category: 'Dairy', rev: '$1.54M', growth: '-2.1%', status: 'At Risk' },
                { sku: 'SKU-40117', name: 'Frozen Berries 1kg', category: 'Frozen', rev: '$1.22M', growth: '+5.3%', status: 'On Track' },
                { sku: 'SKU-50803', name: 'Cold Brew Coffee 1L', category: 'Beverages', rev: '$1.08M', growth: '+22.9%', status: 'Growth' },
              ]}
              renderCell={(col, row) => {
                if (col.key === 'status') {
                  const map = { 'On Track': 'bg-emerald-50 text-emerald-700', 'At Risk': 'bg-rose-50 text-rose-700', 'Growth': 'bg-blue-50 text-blue-700' }
                  return <Badge variant="secondary" className={`${map[row.status]} hover:${map[row.status]}`}>{row.status}</Badge>
                }
                if (col.key === 'growth') {
                  const positive = row.growth.startsWith('+')
                  return <span className={positive ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>{row.growth}</span>
                }
                return row[col.key]
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alerts & Exceptions</CardTitle>
            <CardDescription>4 active items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a, i) => {
              const sevMap = {
                high: 'bg-rose-500',
                medium: 'bg-amber-500',
                low: 'bg-blue-500',
              }
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
function DemandPage() {
  const forecast = [
    { w: 'W1', baseline: 120, forecast: 128, actual: 132 },
    { w: 'W2', baseline: 125, forecast: 134, actual: 130 },
    { w: 'W3', baseline: 130, forecast: 140, actual: 138 },
    { w: 'W4', baseline: 128, forecast: 138, actual: 141 },
    { w: 'W5', baseline: 135, forecast: 145, actual: null },
    { w: 'W6', baseline: 140, forecast: 150, actual: null },
    { w: 'W7', baseline: 145, forecast: 156, actual: null },
    { w: 'W8', baseline: 148, forecast: 160, actual: null },
  ]

  return (
    <div>
      <SectionHeader
        title="Demand Planning"
        description="Consensus forecast across statistical models, sales input, and market intelligence"
        actions={
          <>
            <Select defaultValue="na">
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="na">North America</SelectItem>
                <SelectItem value="eu">Europe</SelectItem>
                <SelectItem value="apac">APAC</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2"><Sparkles className="h-4 w-4" />Re-forecast</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Forecast Accuracy" value="92.4%" change="+1.8%" icon={TrendingUp} accent="blue" />
        <KpiCard title="Bias" value="-1.2%" change="-0.4pp" trend="down" subtitle="slight under-forecast" icon={GitBranch} accent="amber" />
        <KpiCard title="Total Forecast (8W)" value="1.15M units" change="+6.2%" icon={Package} accent="green" />
        <KpiCard title="New Product Intros" value="12 SKUs" subtitle="3 at risk" icon={Plus} accent="purple" />
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">8-Week Demand Forecast</CardTitle>
          <CardDescription>Statistical baseline vs consensus forecast vs actual (000 units)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Forecast Detail by SKU</CardTitle>
          <CardDescription>Current cycle · editable values</CardDescription>
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
            rows={[
              { sku: 'SKU-10842', name: 'Sparkling Water 500ml', baseline: '48,200', consensus: '52,400', accuracy: 94, trend: '↗' },
              { sku: 'SKU-20591', name: 'Organic Granola 340g', baseline: '31,600', consensus: '33,100', accuracy: 91, trend: '↗' },
              { sku: 'SKU-30220', name: 'Greek Yogurt Multipack', baseline: '22,400', consensus: '20,800', accuracy: 87, trend: '↘' },
              { sku: 'SKU-40117', name: 'Frozen Berries 1kg', baseline: '15,900', consensus: '16,500', accuracy: 93, trend: '→' },
              { sku: 'SKU-50803', name: 'Cold Brew Coffee 1L', baseline: '12,300', consensus: '15,100', accuracy: 89, trend: '↗' },
            ]}
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
function OrdersPage() {
  const orders = [
    { id: 'ORD-48219', dist: 'NorthStar Foods', region: 'Northeast', items: 142, value: '$184,200', status: 'Pending', eta: 'Aug 12' },
    { id: 'ORD-48218', dist: 'Coastal Distribution Co', region: 'West', items: 98, value: '$121,500', status: 'Approved', eta: 'Aug 10' },
    { id: 'ORD-48217', dist: 'Midwest Supply Partners', region: 'Midwest', items: 211, value: '$268,900', status: 'In Transit', eta: 'Aug 09' },
    { id: 'ORD-48216', dist: 'Sunbelt Wholesale', region: 'South', items: 76, value: '$94,300', status: 'Delivered', eta: 'Aug 07' },
    { id: 'ORD-48215', dist: 'Rockies Trading LLC', region: 'Mountain', items: 54, value: '$71,800', status: 'Backorder', eta: 'Aug 15' },
    { id: 'ORD-48214', dist: 'NorthStar Foods', region: 'Northeast', items: 132, value: '$172,400', status: 'Delivered', eta: 'Aug 05' },
  ]

  const statusMap = {
    Pending: 'bg-amber-50 text-amber-700',
    Approved: 'bg-blue-50 text-blue-700',
    'In Transit': 'bg-violet-50 text-violet-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    Backorder: 'bg-rose-50 text-rose-700',
  }

  return (
    <div>
      <SectionHeader
        title="Distributor Orders"
        description="Manage incoming orders, approvals, and fulfillment status across your distributor network"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Filter</Button>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New Order</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Open Orders" value="1,284" change="-2.1%" trend="down" icon={Package} accent="blue" />
        <KpiCard title="Order Value" value="$8.41M" change="+6.8%" subtitle="30 day rolling" icon={DollarSign} accent="green" />
        <KpiCard title="On-Time Fill Rate" value="96.2%" change="+0.4%" icon={TrendingUp} accent="purple" />
        <KpiCard title="Backorders" value="47" change="-12%" trend="down" subtitle="18 distributors" icon={ArrowDownRight} accent="rose" />
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <CardDescription>Showing 6 of 1,284 orders</CardDescription>
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
              { key: 'eta', label: 'ETA' },
              { key: 'status', label: 'Status' },
            ]}
            rows={orders}
            renderCell={(col, row) => {
              if (col.key === 'status') {
                return <Badge variant="secondary" className={`${statusMap[row.status]} hover:${statusMap[row.status]}`}>{row.status}</Badge>
              }
              if (col.key === 'id') return <span className="font-mono text-xs text-slate-700">{row.id}</span>
              if (col.key === 'value') return <span className="font-medium">{row.value}</span>
              return row[col.key]
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =============== PAGE: SUPPLY PLANNING ===============
function SupplyPage() {
  const capacity = [
    { plant: 'Plant A', used: 92, total: 100 },
    { plant: 'Plant B', used: 78, total: 100 },
    { plant: 'Plant C', used: 88, total: 100 },
    { plant: 'Plant D', used: 71, total: 100 },
    { plant: 'Plant E', used: 95, total: 100 },
    { plant: 'Plant F', used: 83, total: 100 },
  ]
  const inventoryTrend = [
    { w: 'W1', oh: 820, target: 900 },
    { w: 'W2', oh: 790, target: 900 },
    { w: 'W3', oh: 860, target: 900 },
    { w: 'W4', oh: 910, target: 900 },
    { w: 'W5', oh: 940, target: 900 },
    { w: 'W6', oh: 880, target: 900 },
    { w: 'W7', oh: 920, target: 900 },
    { w: 'W8', oh: 950, target: 900 },
  ]

  return (
    <div>
      <SectionHeader
        title="Supply Planning"
        description="Capacity, inventory, and procurement alignment to meet consensus demand"
        actions={<Button size="sm" className="gap-2"><Sparkles className="h-4 w-4" />Run MRP</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Capacity Utilization" value="87%" change="+3.2%" icon={Factory} accent="blue" />
        <KpiCard title="Inventory On Hand" value="950K units" change="+5.5%" subtitle="$42.1M value" icon={Package} accent="green" />
        <KpiCard title="Weeks of Supply" value="6.2" subtitle="target 6.0" icon={TrendingUp} accent="amber" />
        <KpiCard title="Stockout Risk SKUs" value="18" change="-3" trend="down" icon={ArrowDownRight} accent="rose" />
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
            <CardDescription>Network total, 8 week view (000 units)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="oh" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="On Hand" />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Supply Plan by SKU</CardTitle>
          <CardDescription>Production schedule vs demand coverage</CardDescription>
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
            rows={[
              { sku: 'SKU-10842', name: 'Sparkling Water 500ml', plant: 'Plant A', demand: '52,400', planned: '54,000', cover: 103, status: 'Balanced' },
              { sku: 'SKU-20591', name: 'Organic Granola 340g', plant: 'Plant C', demand: '33,100', planned: '33,500', cover: 101, status: 'Balanced' },
              { sku: 'SKU-30220', name: 'Greek Yogurt Multipack', plant: 'Plant B', demand: '20,800', planned: '18,500', cover: 89, status: 'Short' },
              { sku: 'SKU-40117', name: 'Frozen Berries 1kg', plant: 'Plant E', demand: '16,500', planned: '17,200', cover: 104, status: 'Balanced' },
              { sku: 'SKU-50803', name: 'Cold Brew Coffee 1L', plant: 'Plant D', demand: '15,100', planned: '14,000', cover: 93, status: 'Short' },
            ]}
            renderCell={(col, row) => {
              if (col.key === 'status') {
                const map = { Balanced: 'bg-emerald-50 text-emerald-700', Short: 'bg-rose-50 text-rose-700', Surplus: 'bg-amber-50 text-amber-700' }
                return <Badge variant="secondary" className={`${map[row.status]} hover:${map[row.status]}`}>{row.status}</Badge>
              }
              if (col.key === 'cover') {
                return (
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(row.cover, 100)} className="h-1.5 w-20" />
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
function FinancialPage() {
  const pnl = [
    { m: 'Jan', revenue: 42, cogs: 26, gm: 16 },
    { m: 'Feb', revenue: 45, cogs: 27, gm: 18 },
    { m: 'Mar', revenue: 48, cogs: 29, gm: 19 },
    { m: 'Apr', revenue: 52, cogs: 31, gm: 21 },
    { m: 'May', revenue: 55, cogs: 33, gm: 22 },
    { m: 'Jun', revenue: 60, cogs: 36, gm: 24 },
    { m: 'Jul', revenue: 63, cogs: 37, gm: 26 },
    { m: 'Aug', revenue: 66, cogs: 39, gm: 27 },
  ]

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
        <KpiCard title="Revenue YTD" value="$431M" change="+8.4%" subtitle="vs plan $412M" icon={DollarSign} accent="green" />
        <KpiCard title="Gross Margin" value="40.2%" change="+0.8pp" icon={TrendingUp} accent="blue" />
        <KpiCard title="Operating Margin" value="18.4%" change="+1.1pp" icon={TrendingUp} accent="purple" />
        <KpiCard title="Working Capital" value="$112M" change="-3.2%" trend="down" subtitle="DSO 42 days" icon={Package} accent="amber" />
      </div>

      <Card className="border-slate-200/70 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">P&L Summary ($M)</CardTitle>
          <CardDescription>Revenue · COGS · Gross Margin by month</CardDescription>
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
            rows={[
              { cat: 'Beverages', budget: '$146M', actual: '$152M', var: '+$6M', attain: 104 },
              { cat: 'Snacks', budget: '$108M', actual: '$112M', var: '+$4M', attain: 103 },
              { cat: 'Dairy', budget: '$84M', actual: '$79M', var: '-$5M', attain: 94 },
              { cat: 'Frozen', budget: '$52M', actual: '$54M', var: '+$2M', attain: 103 },
              { cat: 'Other', budget: '$34M', actual: '$34M', var: '$0M', attain: 100 },
            ]}
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
function ScenarioPage() {
  const [demand, setDemand] = useState([5])
  const [cost, setCost] = useState([0])
  const [capacity, setCapacity] = useState([0])

  const baseRevenue = 66
  const baseCogs = 39
  const scenarios = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => {
    const factor = 1 + (demand[0] / 100) + (i * 0.02)
    const rev = +(baseRevenue * 3 * factor).toFixed(1)
    const cogFactor = 1 + (cost[0] / 100)
    const cog = +(baseCogs * 3 * cogFactor * (1 + i * 0.015)).toFixed(1)
    return { q, baseline: +(baseRevenue * 3 * (1 + i * 0.02)).toFixed(1), scenario: rev, gm: +(rev - cog).toFixed(1) }
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
function ChatbotPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your S&OP planning assistant. Ask me anything about your forecast, supply plan, or financials." },
  ])
  const [input, setInput] = useState('')

  const suggestions = [
    'What is driving the dairy forecast miss?',
    'Which plants are over 90% utilization?',
    'Summarize Q3 scenario outcomes',
    'Top 5 distributors at risk of stockout',
  ]

  const canned = {
    default: "Based on the latest consensus plan, I see strong revenue momentum (+8.4% YTD) with capacity constraints emerging at Plants A and E. I recommend reviewing the scenario planning module to model mitigation options.",
  }

  const handleSend = (text) => {
    const msg = (text ?? input).trim()
    if (!msg) return
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setInput('')
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', text: canned.default }])
    }, 600)
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

  const renderPage = () => {
    switch (active) {
      case 'dashboard': return <DashboardPage />
      case 'demand': return <DemandPage />
      case 'orders': return <OrdersPage />
      case 'supply': return <SupplyPage />
      case 'financial': return <FinancialPage />
      case 'scenario': return <ScenarioPage />
      case 'chatbot': return <ChatbotPage />
      default: return <DashboardPage />
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
