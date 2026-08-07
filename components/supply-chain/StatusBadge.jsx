'use client'

import React from 'react'

export default function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase()

  const config = {
    FEASIBLE: { label: 'Feasible', style: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60' },
    HEALTHY: { label: 'Healthy', style: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60' },
    APPROVED: { label: 'Approved', style: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60' },
    CLOSED: { label: 'Closed', style: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    COMPLETED: { label: 'Completed', style: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60' },
    ACTIVE: { label: 'Active', style: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border-indigo-800/60' },
    QUALIFIED: { label: 'Qualified', style: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border-indigo-800/60' },
    SHORTAGE: { label: 'Shortage', style: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/60 font-semibold' },
    CRITICAL: { label: 'Critical', style: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/60 font-semibold' },
    HIGH: { label: 'High Risk', style: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/60 font-semibold' },
    WARNING: { label: 'Warning', style: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800/60' },
    MEDIUM: { label: 'Medium', style: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800/60' },
    IN_PROGRESS: { label: 'In Progress', style: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-400 dark:border-sky-800/60' },
    IN_TRANSIT: { label: 'In Transit', style: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-400 dark:border-cyan-800/60' },
    CONFIRMED: { label: 'Confirmed', style: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-400 dark:border-blue-800/60' },
  }

  const item = config[s] || { label: status || 'Unknown', style: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' }

  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium tracking-wide inline-flex items-center space-x-1 ${item.style}`}>
      <span>{item.label}</span>
    </span>
  )
}

