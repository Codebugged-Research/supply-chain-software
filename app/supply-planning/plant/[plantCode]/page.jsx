'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Factory,
  ArrowLeft,
  Sliders,
  CheckCircle2,
  MapPin
} from 'lucide-react'

export default function PlantDetailPage({ params }) {
  const plantCode = params?.plantCode || 'PLANT-NOIDA'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlant() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/supply-planning?action=plant_detail&plantCode=${plantCode}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (e) {
        console.error('Failed to load plant detail:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchPlant()
  }, [plantCode])

  const master = data?.master || {}
  const mappings = data?.mappings || []
  const orders = data?.orders || []

  return (
    <SupplyChainLayout activeTitle={`Plant 360° Detail: ${plantCode}`}>
      {/* Back Button & Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/supply-planning/capacity"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{master.plantName || plantCode}</h2>
            <StatusBadge status={master.status || 'ACTIVE'} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Plant Code: {plantCode} | Location: {master.city}, {master.state}, {master.country} | Timezone: {master.timezone || 'Asia/Kolkata'}
          </p>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Daily Rated Capacity"
          value={`${(master.dailyCapacity || 25000).toLocaleString()} Units`}
          subtitle="2 Shifts per day (8.0 hours)"
          badgeText="Daily Capacity"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Weekly Rated Capacity"
          value={`${(master.weeklyCapacity || 150000).toLocaleString()} Units`}
          subtitle="6 Working Days per week"
          badgeText="Weekly Capacity"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Factory Line OEE Efficiency"
          value="85.0%"
          subtitle="Overall Equipment Effectiveness"
          badgeText="Optimal Efficiency"
          badgeType="success"
          loading={loading}
        />
      </div>

      {/* Qualified Assembly Lines & Work Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Factory className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Qualified Assembly Lines & SKU Mappings</span>
          </h3>
          <div className="space-y-2">
            {mappings.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">{m.productionLine}</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">SKU: {m.skuCode}</p>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{m.dailyCapacity?.toLocaleString()} Units / Day</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Active MES Work Orders</span>
          </h3>
          {orders.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No active work orders currently scheduled for this plant.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 4).map((o, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <div>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{o.productionOrderNo}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{o.skuCode}</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{o.plannedQty?.toLocaleString()} Units</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SupplyChainLayout>
  )
}

