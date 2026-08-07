import mongoose from 'mongoose';

/**
 * supply_constraints Schema
 * Exception and bottleneck diagnostic log generated during MRP feasibility runs.
 */
const supplyConstraintSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    constraintType: {
      type: String,
      required: [true, 'constraintType is required'],
      enum: {
        values: [
          'SUPPLIER_DELAY',
          'CAPACITY',
          'INVENTORY',
          'MATERIAL_SHORTAGE',
          'WAREHOUSE_FULL',
          'TRANSPORTATION_DELAY'
        ],
        message: '{VALUE} is not a valid constraintType'
      }
    },
    constraintSource: {
      type: String,
      required: [true, 'constraintSource is required'],
      trim: true
    },
    severity: {
      type: String,
      required: [true, 'severity is required'],
      enum: {
        values: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        message: '{VALUE} is not a valid severity'
      },
      default: 'MEDIUM'
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
      maxlength: [500, 'description cannot exceed 500 characters']
    },
    recommendedAction: {
      type: String,
      required: [true, 'recommendedAction is required'],
      trim: true,
      maxlength: [500, 'recommendedAction cannot exceed 500 characters']
    },
    resolved: {
      type: Boolean,
      required: [true, 'resolved is required'],
      default: false
    },
    rootCauseTree: {
      primaryCategory: { type: String, default: 'DEMAND_SURGE' },
      triggerEvent: { type: String, default: null },
      upstreamSource: { type: String, default: null },
      causalSteps: [{ type: String }]
    },
    createdAt: {
      type: Date,
      required: [true, 'createdAt is required'],
      default: Date.now
    }
  },
  {
    collection: 'supply_constraints',
    timestamps: true
  }
);

// Indexes
supplyConstraintSchema.index({ severity: 1, resolved: 1, createdAt: -1 });
supplyConstraintSchema.index({ skuCode: 1, resolved: 1 });
supplyConstraintSchema.index({ constraintType: 1, constraintSource: 1, resolved: 1 });

const SupplyConstraint = mongoose.models.SupplyConstraint || mongoose.model('SupplyConstraint', supplyConstraintSchema);

export default SupplyConstraint;
