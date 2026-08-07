'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Grid,
  Boxes,
  Factory,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Layers,
  RefreshCw,
  Sun,
  Moon,
  Database
} from 'lucide-react'

const navItems = [
  { name: 'Input & Data Sources', href: '/supply-planning/data-sources', icon: Database },
  { name: 'Overview Cockpit', href: '/supply-planning', icon: LayoutDashboard },
  { name: 'Supply Workspace', href: '/supply-planning/workspace', icon: Grid },
  { name: 'Materials & BOM', href: '/supply-planning/materials', icon: Boxes },
  { name: 'Capacity Planning', href: '/supply-planning/capacity', icon: Factory },
  { name: 'Procurement POs', href: '/supply-planning/procurement', icon: ShoppingCart },
  { name: 'Network & Transfers', href: '/supply-planning/distribution', icon: Truck },
  { name: 'Constraints & Risks', href: '/supply-planning/constraints', icon: AlertTriangle },
  { name: 'Scenario Studio', href: '/supply-planning/scenarios', icon: Layers }
]

export default function SupplyChainLayout({ children, activeTitle = "Supply Planning Workspace" }) {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('supply_chain_theme')
    if (saved) {
      setIsDark(saved === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('supply_chain_theme', next ? 'dark' : 'light')
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200">
        {/* Top System Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm overflow-hidden p-0.5">
                <img src="/vanco-only-logo.png" alt="Vanco Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide">Executive S&OP Suite</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enterprise Supply Planning Module</p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

            {(() => {
              const now = new Date()
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
              const currentMonth = monthNames[now.getMonth()] || "August"
              const startOfYear = new Date(now.getFullYear(), 0, 1)
              const pastDays = (now - startOfYear) / 86400000
              const weekNum = Math.min(Math.max(Math.ceil((pastDays + startOfYear.getDay() + 1) / 7), 1), 52)
              const weekLabel = `2026-W${String(weekNum).padStart(2, '0')}`
              const firmEnd = Math.min(weekNum + 3, 52)
              const poEnd = Math.min(weekNum + 12, 52)
              return (
                <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Domain: <strong className="text-slate-800 dark:text-slate-200">Imagine Marketing Ltd</strong></span>
                  <span>•</span>
                  <span>Current: <strong className="text-slate-800 dark:text-slate-200">{weekLabel} ({currentMonth})</strong></span>
                  <span>•</span>
                  <span>S&OP Horizon: <strong className="text-slate-800 dark:text-slate-200">52 Weeks</strong> <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">(Firm: W{weekNum} to W{firmEnd} | PO Queue: W{firmEnd + 1} to W{poEnd})</span></span>
                </div>
              )
            })()}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              title="Refresh Data Feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center justify-center relative group"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 group-hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-200 group-hover:-rotate-12" />
              )}
            </button>
          </div>
        </header>

        {/* Main Navigation Sub-Bar */}
        <div className="bg-white/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800/80 px-6 overflow-x-auto scrollbar-none transition-colors duration-200">
          <nav className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/supply-planning' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${isActive
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:text-indigo-400 dark:bg-indigo-950/20'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-700'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Content Body Container */}
        <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Footer System Telemetry */}
        <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-6 py-3 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between gap-2 transition-colors duration-200">
          <span>Executive S&OP Suite • Supply Planning Module</span>
          <span>Control Tower Status: Active</span>
        </footer>
      </div>
    </div>
  )
}
