import mongoose from 'mongoose';

/**
 * product_logistics Schema
 * Packaging dimensions, weight, and environmental handling specs.
 */
const productLogisticsSchema = new mongoose.Schema(
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
    netWeightKg: {
      type: Number,
      required: [true, 'netWeightKg is required'],
      min: [0, 'netWeightKg cannot be negative'],
      default: 0.0
    },
    grossWeightKg: {
      type: Number,
      required: [true, 'grossWeightKg is required'],
      min: [0, 'grossWeightKg cannot be negative'],
      default: 0.0
    },
    productLengthCm: {
      type: Number,
      required: [true, 'productLengthCm is required'],
      min: [0, 'productLengthCm cannot be negative'],
      default: 0.0
    },
    productWidthCm: {
      type: Number,
      required: [true, 'productWidthCm is required'],
      min: [0, 'productWidthCm cannot be negative'],
      default: 0.0
    },
    productHeightCm: {
      type: Number,
      required: [true, 'productHeightCm is required'],
      min: [0, 'productHeightCm cannot be negative'],
      default: 0.0
    },
    productVolume: {
      type: Number,
      required: [true, 'productVolume is required'],
      min: [0, 'productVolume cannot be negative'],
      default: 0.0
    },
    cartonQuantity: {
      type: Number,
      required: [true, 'cartonQuantity is required'],
      min: [1, 'cartonQuantity must be at least 1'],
      default: 1
    },
    cartonLength: {
      type: Number,
      required: [true, 'cartonLength is required'],
      min: [0, 'cartonLength cannot be negative'],
      default: 0.0
    },
    cartonWidth: {
      type: Number,
      required: [true, 'cartonWidth is required'],
      min: [0, 'cartonWidth cannot be negative'],
      default: 0.0
    },
    cartonHeight: {
      type: Number,
      required: [true, 'cartonHeight is required'],
      min: [0, 'cartonHeight cannot be negative'],
      default: 0.0
    },
    cartonWeight: {
      type: Number,
      required: [true, 'cartonWeight is required'],
      min: [0, 'cartonWeight cannot be negative'],
      default: 0.0
    },
    palletQuantity: {
      type: Number,
      required: [true, 'palletQuantity is required'],
      min: [1, 'palletQuantity must be at least 1'],
      default: 1
    },
    stackLimit: {
      type: Number,
      required: [true, 'stackLimit is required'],
      min: [1, 'stackLimit must be at least 1'],
      max: [20, 'stackLimit cannot exceed 20'],
      default: 3
    },
    fragile: {
      type: Boolean,
      required: [true, 'fragile is required'],
      default: false
    },
    hazardousMaterial: {
      type: Boolean,
      required: [true, 'hazardousMaterial is required'],
      default: false
    },
    storageCondition: {
      type: String,
      required: [true, 'storageCondition is required'],
      enum: {
        values: ['AMBIENT', 'COLD_STORAGE', 'HAZMAT', 'SECURE_VAULT'],
        message: '{VALUE} is not a valid storageCondition'
      },
      default: 'AMBIENT'
    }
  },
  {
    collection: 'product_logistics',
    timestamps: true
  }
);

// Compound Index
productLogisticsSchema.index({ hazardousMaterial: 1, storageCondition: 1 });

const ProductLogistics = mongoose.models.ProductLogistics || mongoose.model('ProductLogistics', productLogisticsSchema);

export default ProductLogistics;
