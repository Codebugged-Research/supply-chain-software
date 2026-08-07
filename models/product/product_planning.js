import mongoose from 'mongoose';

/**
 * product_planning Schema
 * SKU-level planning parameters and replenishment controls for MRP.
 */
const productPlanningSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      unique: true,
      ref: 'ProductMaster',
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,30}$/, 'Invalid skuCode format']
    },
    abcClass: {
      type: String,
      required: [true, 'abcClass is required'],
      enum: {
        values: ['A', 'B', 'C'],
        message: '{VALUE} is not a valid abcClass'
      },
      default: 'B'
    },
    xyzClass: {
      type: String,
      required: [true, 'xyzClass is required'],
      enum: {
        values: ['X', 'Y', 'Z'],
        message: '{VALUE} is not a valid xyzClass'
      },
      default: 'Y'
    },
    planningStrategy: {
      type: String,
      required: [true, 'planningStrategy is required'],
      enum: {
        values: ['MTS', 'MTO', 'ATO', 'ETO'],
        message: '{VALUE} is not a valid planningStrategy'
      },
      default: 'MTS'
    },
    planningPriority: {
      type: Number,
      required: [true, 'planningPriority is required'],
      min: [1, 'planningPriority must be at least 1'],
      max: [100, 'planningPriority cannot exceed 100'],
      default: 50
    },
    planningFenceDays: {
      type: Number,
      required: [true, 'planningFenceDays is required'],
      min: [0, 'planningFenceDays cannot be negative'],
      default: 7
    },
    demandTimeFenceDays: {
      type: Number,
      required: [true, 'demandTimeFenceDays is required'],
      min: [0, 'demandTimeFenceDays cannot be negative'],
      default: 3
    },
    safetyStockDays: {
      type: Number,
      required: [true, 'safetyStockDays is required'],
      min: [0, 'safetyStockDays cannot be negative'],
      default: 10.0
    },
    reorderPointUnits: {
      type: Number,
      required: [true, 'reorderPointUnits is required'],
      min: [0, 'reorderPointUnits cannot be negative'],
      default: 0
    },
    reorderQuantity: {
      type: Number,
      required: [true, 'reorderQuantity is required'],
      min: [1, 'reorderQuantity must be at least 1'],
      default: 1
    },
    minimumOrderQuantity: {
      type: Number,
      required: [true, 'minimumOrderQuantity is required'],
      min: [1, 'minimumOrderQuantity must be at least 1'],
      default: 1
    },
    maximumInventoryUnits: {
      type: Number,
      min: [0, 'maximumInventoryUnits cannot be negative'],
      default: null
    },
    targetServiceLevel: {
      type: Number,
      required: [true, 'targetServiceLevel is required'],
      min: [80.0, 'targetServiceLevel must be at least 80.0'],
      max: [99.9, 'targetServiceLevel cannot exceed 99.9'],
      default: 95.0
    },
    forecastConsumptionMethod: {
      type: String,
      required: [true, 'forecastConsumptionMethod is required'],
      enum: {
        values: ['FORWARD', 'BACKWARD', 'BOTH'],
        message: '{VALUE} is not a valid forecastConsumptionMethod'
      },
      default: 'BOTH'
    },
    plannerName: {
      type: String,
      trim: true,
      default: null
    },
    plannerGroup: {
      type: String,
      required: [true, 'plannerGroup is required'],
      trim: true,
      default: 'DEFAULT'
    },
    planningCalendar: {
      type: String,
      required: [true, 'planningCalendar is required'],
      enum: {
        values: ['5_DAY', '6_DAY', '7_DAY'],
        message: '{VALUE} is not a valid planningCalendar'
      },
      default: '6_DAY'
    }
  },
  {
    collection: 'product_planning',
    timestamps: true
  }
);

// Compound Indexes
productPlanningSchema.index({ abcClass: 1, xyzClass: 1 });
productPlanningSchema.index({ plannerGroup: 1, plannerName: 1 });

const ProductPlanning = mongoose.models.ProductPlanning || mongoose.model('ProductPlanning', productPlanningSchema);

export default ProductPlanning;
