'use client'

import React, { useState, useEffect } from 'react'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Truck,
  MapPin,
  RefreshCw,
  PlusCircle
} from 'lucide-react'

export default function DistributionPage() {
  const [networkData, setNetworkData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNetwork() {
      setLoading(true)
      try {
        const res = await fetch('/api/v1/supply-planning?action=distribution')
        const json = await res.json()
        if (json.success) {
          setNetworkData(json.data || [])
        }
      } catch (e) {
        console.error('Failed to load distribution network:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchNetwork()
  }, [])

  return (
    <SupplyChainLayout activeTitle="Network Deployment & Inter-DC Transfers">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Inter-DC Transfers In-Transit"
          value="18 Stock Transport Orders"
          subtitle="Connecting Central & Regional DCs"
          badgeText="In Transit"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Average Network Coverage"
          value="18.5 Days of Supply"
          subtitle="Target: 14 to 21 Days"
          badgeText="Balanced Coverage"
          badgeType="success"
          loading={loading}
        />
        <KpiCard
          title="Channel Stock Outage Risk"
          value="0.0%"
          subtitle="Zero unallocated channel orders"
          badgeText="Zero Deficit"
          badgeType="success"
          loading={loading}
        />
      </div>

      {/* Warehouse Distribution Network */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Regional Distribution Center Stock Coverage & Flow Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks stock coverage days across Central DC (Delhi NCR) and Regional DCs (Bhiwandi, Bangalore, Kolkata).
            </p>
          </div>
          <button
            onClick={() => alert("Inter-DC Transfer Order (STO) created!")}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Transfer Order</span>
          </button>
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
                  <th className="px-4 py-3">Warehouse Code</th>
                  <th className="px-4 py-3">Warehouse Name</th>
                  <th className="px-4 py-3">Location / City</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Capacity Units</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Days of Supply</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {networkData.map((wh, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{wh.warehouseCode}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{wh.warehouseName}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{wh.city}, {wh.state}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{wh.warehouseType}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{wh.capacityUnits?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{wh.currentStock?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">{wh.daysOfSupply} Days</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={wh.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SupplyChainLayout>
  )

}
