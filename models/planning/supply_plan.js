import mongoose from 'mongoose';

/**
 * supply_plan Schema
 * Time-phased MRP output net balance sheet and generated planned orders.
 */
const supplyPlanSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    week: {
      type: String,
      required: [true, 'week is required'],
      trim: true,
      match: [/^\d{4}-W\d{2}$/, 'week must be in YYYY-Www format']
    },
    plantCode: {
      type: String,
      ref: 'PlantMaster',
      trim: true,
      uppercase: true,
      default: null
    },
    warehouseCode: {
      type: String,
      ref: 'WarehouseMaster',
      trim: true,
      uppercase: true,
      default: null
    },
    forecastQty: {
      type: Number,
      required: [true, 'forecastQty is required'],
      min: [0, 'forecastQty cannot be negative'],
      default: 0
    },
    availableInventory: {
      type: Number,
      required: [true, 'availableInventory is required'],
      default: 0
    },
    plannedProduction: {
      type: Number,
      required: [true, 'plannedProduction is required'],
      min: [0, 'plannedProduction cannot be negative'],
      default: 0
    },
    plannedPurchase: {
      type: Number,
      required: [true, 'plannedPurchase is required'],
      min: [0, 'plannedPurchase cannot be negative'],
      default: 0
    },
    projectedInventory: {
      type: Number,
      required: [true, 'projectedInventory is required'],
      default: 0
    },
    supplyGap: {
      type: Number,
      required: [true, 'supplyGap is required'],
      min: [0, 'supplyGap cannot be negative'],
      default: 0
    },
    serviceLevel: {
      type: Number,
      required: [true, 'serviceLevel is required'],
      min: [0.0, 'serviceLevel cannot be negative'],
      max: [100.0, 'serviceLevel cannot exceed 100.0'],
      default: 100.0
    },
    planningStatus: {
      type: String,
      required: [true, 'planningStatus is required'],
      enum: {
        values: ['FEASIBLE', 'CONSTRAINED', 'SHORTAGE'],
        message: '{VALUE} is not a valid planningStatus'
      },
      default: 'FEASIBLE'
    },
    generatedAt: {
      type: Date,
      required: [true, 'generatedAt is required'],
      default: Date.now
    }
  },
  {
    collection: 'supply_plan',
    timestamps: true
  }
);

// Indexes
supplyPlanSchema.index({ skuCode: 1, week: 1, plantCode: 1, warehouseCode: 1 }, { unique: true });
supplyPlanSchema.index({ plantCode: 1, week: 1, plannedProduction: 1 });
supplyPlanSchema.index({ warehouseCode: 1, week: 1, plannedPurchase: 1 });
supplyPlanSchema.index({ supplyGap: -1, planningStatus: 1 });

const SupplyPlan = mongoose.models.SupplyPlan || mongoose.model('SupplyPlan', supplyPlanSchema);

export default SupplyPlan;
