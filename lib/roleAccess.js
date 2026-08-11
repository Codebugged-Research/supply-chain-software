export const PLANNING_ROLES = ['Production', 'Sourcing', 'S&OP', 'NPI', 'Category', 'Sales', 'Finance']

export const ROLE_PROFILES = {
  Production: {
    description: 'Plant capacity, constrained supply, dispatch execution and inventory actions.',
    permissions: ['dashboard.view', 'dispatch.view', 'supply.*', 'inventory.view', 'inventory.manage', 'scenario.view'],
  },
  Sourcing: {
    description: 'Supplier capacity, purchase commitments, procurement risk and inventory visibility.',
    permissions: ['dashboard.view', 'supply.overview', 'supply.materials', 'supply.capacity', 'supply.procurement', 'supply.distribution', 'supply.constraints', 'supply.scenarios', 'inventory.view', 'scenario.view'],
  },
  'S&OP': {
    description: 'Enterprise-wide demand, supply, inventory, scenario and signoff authority.',
    permissions: ['*'],
  },
  NPI: {
    description: 'Launch forecasts, lifecycle, BOM readiness, capacity ramp and inventory cover.',
    permissions: ['dashboard.view', 'demand.view', 'demand.overview', 'demand.ai', 'demand.npi', 'demand.events', 'demand.kpi', 'supply.overview', 'supply.workspace', 'supply.materials', 'supply.capacity', 'supply.procurement', 'supply.constraints', 'supply.scenarios', 'inventory.view', 'scenario.view'],
  },
  Category: {
    description: 'Category forecasts, events, lifecycle, consensus, listings and inventory health.',
    permissions: ['dashboard.view', 'demand.*', 'factors.view', 'orders.view', 'dispatch.view', 'inventory.view', 'scenario.view'],
  },
  Sales: {
    description: 'Channel forecasts, partner feeds, listings, customer orders and fulfillment.',
    permissions: ['dashboard.view', 'demand.view', 'demand.overview', 'demand.ai', 'demand.events', 'demand.norms', 'demand.consensus', 'demand.integration', 'demand.listings', 'demand.kpi', 'factors.view', 'orders.view', 'dispatch.view', 'inventory.view', 'scenario.view'],
  },
  Finance: {
    description: 'Plan economics, consensus gate, scenarios and enterprise review visibility.',
    permissions: ['dashboard.view', 'demand.view', 'demand.overview', 'demand.ai', 'demand.consensus', 'demand.kpi', 'inventory.view', 'scenario.view'],
  },
}

export const ROOT_TAB_PERMISSIONS = {
  dashboard: 'dashboard.view',
  demand: 'demand.view',
  factors: 'factors.view',
  orders: 'orders.view',
  dispatch: 'dispatch.view',
  supply: 'supply.overview',
  inventory: 'inventory.view',
  scenario: 'scenario.view',
  // Financial Planning and Chatbot are explicitly outside this RBAC increment.
  financial: null,
  chatbot: null,
}

export const DEMAND_SECTION_PERMISSIONS = {
  overview: 'demand.overview',
  intelligence: 'demand.ai',
  'npi-lifecycle': 'demand.npi',
  events: 'demand.events',
  norms: 'demand.norms',
  consensus: 'demand.consensus',
  integration: 'demand.integration',
  listings: 'demand.listings',
  kpis: 'demand.kpi',
}

export const SUPPLY_NAV_ITEMS = [
  { name: 'Input & Data Sources', href: '/supply-planning/data-sources', permission: 'supply.data' },
  { name: 'Overview Cockpit', href: '/supply-planning', permission: 'supply.overview' },
  { name: 'Supply Workspace', href: '/supply-planning/workspace', permission: 'supply.workspace' },
  { name: 'Materials & BOM', href: '/supply-planning/materials', permission: 'supply.materials' },
  { name: 'Capacity Planning', href: '/supply-planning/capacity', permission: 'supply.capacity' },
  { name: 'Procurement POs', href: '/supply-planning/procurement', permission: 'supply.procurement' },
  { name: 'Network & Transfers', href: '/supply-planning/distribution', permission: 'supply.distribution' },
  { name: 'Constraints & Risks', href: '/supply-planning/constraints', permission: 'supply.constraints' },
  { name: 'Scenario Studio', href: '/supply-planning/scenarios', permission: 'supply.scenarios' },
]

export function hasPermission(role, permission) {
  if (!permission) return true
  const permissions = ROLE_PROFILES[role]?.permissions || []
  if (permissions.includes('*') || permissions.includes(permission)) return true
  const domain = permission.split('.')[0]
  return permissions.includes(`${domain}.*`)
}

export function canAccessRootTab(role, tabId) {
  return hasPermission(role, ROOT_TAB_PERMISSIONS[tabId])
}

export function canAccessDemandSection(role, sectionId) {
  return hasPermission(role, DEMAND_SECTION_PERMISSIONS[sectionId])
}

export function permissionForSupplyPath(pathname) {
  const matches = SUPPLY_NAV_ITEMS.filter((item) => pathname === item.href || (item.href !== '/supply-planning' && pathname.startsWith(item.href))).sort((a, b) => b.href.length - a.href.length)
  if (matches[0]) return matches[0].permission
  if (pathname.startsWith('/supply-planning/supplier/')) return 'supply.procurement'
  if (pathname.startsWith('/supply-planning/plant/')) return 'supply.capacity'
  if (pathname.startsWith('/supply-planning/sku/')) return 'supply.workspace'
  return 'supply.overview'
}

export const ROLE_STORAGE_KEY = 'sop_active_role'
