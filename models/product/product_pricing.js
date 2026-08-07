import mongoose from 'mongoose';

/**
 * product_pricing Schema
 * Cost baselines and valuation parameters.
 */
const productPricingSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,30}$/, 'Invalid skuCode format']
    },
    standardCost: {
      type: Number,
      required: [true, 'standardCost is required'],
      min: [0, 'standardCost cannot be negative'],
      default: 0.00
    },
    manufacturingCost: {
      type: Number,
      required: [true, 'manufacturingCost is required'],
      min: [0, 'manufacturingCost cannot be negative'],
      default: 0.00
    },
    landedCost: {
      type: Number,
      required: [true, 'landedCost is required'],
      min: [0, 'landedCost cannot be negative'],
      default: 0.00
    },
    transferPrice: {
      type: Number,
      min: [0, 'transferPrice cannot be negative'],
      default: null
    },
    mrp: {
      type: Number,
      required: [true, 'mrp is required'],
      min: [0, 'mrp cannot be negative'],
      default: 0.00
    },
    averageSellingPrice: {
      type: Number,
      required: [true, 'averageSellingPrice is required'],
      min: [0, 'averageSellingPrice cannot be negative'],
      default: 0.00
    },
    targetMarginPercent: {
      type: Number,
      required: [true, 'targetMarginPercent is required'],
      min: [0.0, 'targetMarginPercent cannot be negative'],
      max: [100.0, 'targetMarginPercent cannot exceed 100.0'],
      default: 20.0
    },
    currency: {
      type: String,
      required: [true, 'currency is required'],
      trim: true,
      uppercase: true,
      minlength: [3, 'Currency code must be 3 letters'],
      maxlength: [3, 'Currency code must be 3 letters'],
      default: 'INR'
    },
    effectiveFrom: {
      type: Date,
      required: [true, 'effectiveFrom is required'],
      default: Date.now
    }
  },
  {
    collection: 'product_pricing',
    timestamps: true
  }
);

// Compound Unique Index
productPricingSchema.index({ skuCode: 1, effectiveFrom: -1 }, { unique: true });

const ProductPricing = mongoose.models.ProductPricing || mongoose.model('ProductPricing', productPricingSchema);

export default ProductPricing;
