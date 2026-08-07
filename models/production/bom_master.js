import mongoose from 'mongoose';

/**
 * bom_master Schema
 * Multi-level Bill of Materials component consumption structure.
 */
const bomMasterSchema = new mongoose.Schema(
  {
    parentSku: {
      type: String,
      required: [true, 'parentSku is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    componentSku: {
      type: String,
      required: [true, 'componentSku is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [0.0001, 'quantity must be greater than 0'],
      default: 1.0
    },
    unitOfMeasure: {
      type: String,
      required: [true, 'unitOfMeasure is required'],
      enum: {
        values: ['EA', 'KG', 'LTR', 'MTR'],
        message: '{VALUE} is not a valid unitOfMeasure'
      },
      default: 'EA'
    },
    scrapPercent: {
      type: Number,
      required: [true, 'scrapPercent is required'],
      min: [0.0, 'scrapPercent cannot be negative'],
      max: [50.0, 'scrapPercent cannot exceed 50.0'],
      default: 0.0
    },
    isOptional: {
      type: Boolean,
      required: [true, 'isOptional is required'],
      default: false
    },
    effectiveFrom: {
      type: Date,
      required: [true, 'effectiveFrom is required'],
      default: Date.now
    },
    effectiveTo: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'bom_master',
    timestamps: true
  }
);

// Indexes
bomMasterSchema.index({ parentSku: 1, componentSku: 1, effectiveFrom: 1 }, { unique: true });
bomMasterSchema.index({ componentSku: 1, parentSku: 1 });

const BomMaster = mongoose.models.BomMaster || mongoose.model('BomMaster', bomMasterSchema);

export default BomMaster;
