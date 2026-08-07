'use client'

import React from 'react'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  loading = false,
  error = null,
  empty = false,
  onClick,
  badgeText,
  badgeType = "info"
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-4/5" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl p-5 text-rose-800 dark:text-rose-300 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4" />
          <span>{title}</span>
        </div>
        <p className="text-xs text-rose-600/80 dark:text-rose-400/80">{error || "Failed to load metric"}</p>
      </div>
    )
  }

  const badgeStyles = {
    info: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800/50",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/50",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800/50",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800/50"
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:shadow-indigo-500/10 dark:hover:shadow-indigo-950/30' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
        <span>{title}</span>
        {badgeText && (
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeStyles[badgeType] || badgeStyles.info}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {empty ? 'N/A' : value}
        </span>
        {trend && (
          <span className={`flex items-center text-xs font-medium ${
            trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
            {trendValue}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-normal">
          {subtitle}
        </p>
      )}
    </div>
  )
}

