/**
 * Central Models Registry
 * Re-exports all 18 Mongoose models for the Supply Planning System.
 */

// Domain 1 - Product
export { default as ProductMaster } from './product/product_master.js';
export { default as ProductPlanning } from './product/product_planning.js';
export { default as ProductPricing } from './product/product_pricing.js';
export { default as ProductLogistics } from './product/product_logistics.js';

// Domain 2 - Supply Network
export { default as PlantMaster } from './plant/plant_master.js';
export { default as WarehouseMaster } from './warehouse/warehouse_master.js';
export { default as SupplierMaster } from './supplier/supplier_master.js';
export { default as CustomerChannelMaster } from './channel/customer_channel_master.js';

// Domain 3 - Mapping Collections
export { default as SupplierProductMapping } from './mapping/supplier_product_mapping.js';
export { default as PlantProductMapping } from './mapping/plant_product_mapping.js';

// Domain 4 - Inventory
export { default as Inventory } from './inventory/inventory.js';

// Domain 5 - Manufacturing
export { default as BomMaster } from './production/bom_master.js';
export { default as ProductionOrder } from './production/production_orders.js';

// Domain 6 - Procurement
export { default as PurchaseOrder } from './procurement/purchase_orders.js';

// Domain 7 - Demand Planning
export { default as ConsensusForecast } from './demand/consensus_forecast.js';

// Domain 8 - Supply Planning Outputs
export { default as SupplyPlan } from './planning/supply_plan.js';
export { default as SupplyConstraint } from './planning/supply_constraints.js';
export { default as WhatIfScenario } from './planning/what_if_scenarios.js';

// Domain 9 - Data Integration
export { default as DataSourceLog } from './integration/data_source_log.js';

