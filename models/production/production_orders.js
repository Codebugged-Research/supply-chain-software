import mongoose from 'mongoose';

/**
 * production_orders Schema
 * Factory work order schedule tracking planned vs produced quantities.
 */
const productionOrderSchema = new mongoose.Schema(
  {
    productionOrderNo: {
      type: String,
      required: [true, 'productionOrderNo is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^PO-[A-Z0-9]{8,15}$/, 'Invalid productionOrderNo format']
    },
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    plantCode: {
      type: String,
      required: [true, 'plantCode is required'],
      ref: 'PlantMaster',
      trim: true,
      uppercase: true
    },
    plannedQty: {
      type: Number,
      required: [true, 'plannedQty is required'],
      min: [1, 'plannedQty must be at least 1'],
      default: 0
    },
    producedQty: {
      type: Number,
      required: [true, 'producedQty is required'],
      min: [0, 'producedQty cannot be negative'],
      default: 0
    },
    startDate: {
      type: Date,
      required: [true, 'startDate is required'],
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'endDate is required'],
      default: Date.now
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'PLANNED'
    },
    actualOutputQty: {
      type: Number,
      min: [0, 'actualOutputQty cannot be negative'],
      default: 0
    },
    downtimeHours: {
      type: Number,
      min: [0, 'downtimeHours cannot be negative'],
      default: 0
    },
    downtimeReason: {
      type: String,
      enum: {
        values: ['NONE', 'MAINTENANCE', 'MATERIAL_SHORTAGE', 'POWER_OUTAGE', 'LABOR_SHORTAGE'],
        message: '{VALUE} is not a valid downtimeReason'
      },
      default: 'NONE'
    },
    lineEfficiencyPct: {
      type: Number,
      min: [0.0, 'lineEfficiencyPct cannot be negative'],
      max: [150.0, 'lineEfficiencyPct cannot exceed 150.0'],
      default: 100.0
    }
  },
  {
    collection: 'production_orders',
    timestamps: true
  }
);

// Indexes
productionOrderSchema.index({ plantCode: 1, skuCode: 1, status: 1, startDate: 1 });
productionOrderSchema.index({ skuCode: 1, status: 1, endDate: 1 });

const ProductionOrder = mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', productionOrderSchema);

export default ProductionOrder;
