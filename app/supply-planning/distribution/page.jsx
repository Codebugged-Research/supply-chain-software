'use client'

import React, { useState, useEffect } from 'react'
import SupplyChainLayout from '@/components/supply-chain/SupplyChainLayout'
import StatusBadge from '@/components/supply-chain/StatusBadge'
import KpiCard from '@/components/supply-chain/KpiCard'
import {
  Truck,
  MapPin,
  RefreshCw,
  PlusCircle,
  Ship,
  Plane,
  Anchor,
  FileCheck2
} from 'lucide-react'

export default function DistributionPage() {
  const [networkData, setNetworkData] = useState([])
  const [importShipments, setImportShipments] = useState([])
  const [activeTab, setActiveTab] = useState('network')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNetwork() {
      setLoading(true)
      try {
        const [res, importRes] = await Promise.all([
          fetch('/api/v1/supply-planning?action=distribution'),
          fetch('/api/v1/supply-planning?action=import_control_tower')
        ])
        const [json, importJson] = await Promise.all([res.json(), importRes.json()])
        if (json.success) {
          setNetworkData(json.data || [])
        }
        if (importJson.success) setImportShipments(importJson.data || [])
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
          value={`${networkData.reduce((sum, row) => sum + (row.inboundTransfers?.length || 0), 0)} Stock Transport Orders`}
          subtitle="Connecting Central & Regional DCs"
          badgeText="In Transit"
          badgeType="info"
          loading={loading}
        />
        <KpiCard
          title="Average Network Coverage"
          value={`${networkData.length ? (networkData.reduce((sum, row) => sum + Number(row.daysOfSupply || 0), 0) / networkData.length).toFixed(1) : '—'} Days of Supply`}
          subtitle="Target: 14 to 21 Days"
          badgeText="Balanced Coverage"
          badgeType="success"
          loading={loading}
        />
        <KpiCard
          title="Imported RM & FG In-Transit"
          value={`${importShipments.reduce((sum, item) => sum + item.unitsInTransit, 0).toLocaleString()} Units`}
          subtitle={`${importShipments.filter((item) => item.clearanceStatus === 'CUSTOMS_HOLD').length} customs hold requiring intervention`}
          badgeText="Import Visibility"
          badgeType={importShipments.some((item) => item.risk === 'CRITICAL') ? 'warning' : 'success'}
          loading={loading}
        />
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setActiveTab('network')} className={`px-4 py-2.5 text-xs font-semibold border-b-2 ${activeTab === 'network' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500'}`}>
          Domestic Network & Transfers
        </button>
        <button onClick={() => setActiveTab('imports')} className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 ${activeTab === 'imports' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent text-slate-500'}`}>
          <Ship className="w-3.5 h-3.5" /> RM & FG Import Control Tower
        </button>
      </div>

      {/* Warehouse Distribution Network */}
      {activeTab === 'network' && <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl transition-colors duration-200">
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
      </div>}

      {activeTab === 'imports' && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Anchor className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Import Shipment Milestone & Clearance Tracker</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">One operational view from supplier handover through transit, customs clearance, landed cost, and DC receipt.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="px-2 py-1 rounded bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">RM {importShipments.filter((s) => s.importType === 'RM').length}</span>
              <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">FG {importShipments.filter((s) => s.importType === 'FG').length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr><th className="px-4 py-3">Shipment / Type</th><th className="px-4 py-3">PO & SKU</th><th className="px-4 py-3">Origin / Mode</th><th className="px-4 py-3">Carrier / BoL</th><th className="px-4 py-3">ETA</th><th className="px-4 py-3">Units In-Transit</th><th className="px-4 py-3">Clearance</th><th className="px-4 py-3">Lead-Time Buffer</th><th className="px-4 py-3">Duty + Freight</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {importShipments.map((shipment) => (
                  <tr key={shipment.shipmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3"><p className="font-semibold text-cyan-700 dark:text-cyan-400">{shipment.shipmentId}</p><span className="text-[10px] text-slate-500">{shipment.importType === 'RM' ? 'Raw Material' : 'Finished Goods'}</span></td>
                    <td className="px-4 py-3"><p>{shipment.poNumber}</p><span className="text-[10px] text-indigo-600 dark:text-indigo-400">{shipment.skuCode}</span></td>
                    <td className="px-4 py-3"><p>{shipment.origin}</p><span className="inline-flex items-center gap-1 text-[10px] text-slate-500">{shipment.mode === 'Air' ? <Plane className="w-3 h-3" /> : <Ship className="w-3 h-3" />}{shipment.mode}</span></td>
                    <td className="px-4 py-3"><p className="font-sans">{shipment.carrier}</p><span className="text-[10px] text-slate-500">{shipment.billOfLading}</span></td>
                    <td className="px-4 py-3 font-semibold">{shipment.eta}</td>
                    <td className="px-4 py-3 font-semibold">{shipment.unitsInTransit.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={shipment.clearanceStatus === 'CUSTOMS_HOLD' ? 'CRITICAL' : shipment.clearanceStatus === 'DOCUMENTATION' ? 'WARNING' : 'HEALTHY'} /><p className="text-[9px] mt-1 text-slate-500">{shipment.clearanceStatus.replaceAll('_', ' ')}</p>{shipment.demurrageExposureInr > 0 && <p className="text-[9px] mt-1 text-rose-600 dark:text-rose-400">₹{(shipment.demurrageExposureInr / 1000).toFixed(0)}k demurrage exposure</p>}</td>
                    <td className={`px-4 py-3 font-semibold ${shipment.leadTimeBufferDays < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{shipment.leadTimeBufferDays > 0 ? '+' : ''}{shipment.leadTimeBufferDays} days</td>
                    <td className="px-4 py-3">₹{(shipment.dutyFreightInr / 100000).toFixed(1)}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <FileCheck2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Customs holds and negative buffers are flagged for escalation; cleared shipments roll into available-to-plan inventory.
          </div>
        </div>
      )}
    </SupplyChainLayout>
  )

}
