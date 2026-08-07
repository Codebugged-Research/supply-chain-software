import mongoose from 'mongoose';

/**
 * supplier_product_mapping Schema
 * Sourcing matrix mapping SKUs to approved suppliers with lead times, MOQs, and pricing.
 */
const supplierProductMappingSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      required: [true, 'supplierCode is required'],
      ref: 'SupplierMaster',
      trim: true,
      uppercase: true
    },
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    supplierSku: {
      type: String,
      trim: true,
      default: null
    },
    leadTimeDays: {
      type: Number,
      required: [true, 'leadTimeDays is required'],
      min: [1, 'leadTimeDays must be at least 1'],
      default: 14
    },
    minimumOrderQuantity: {
      type: Number,
      required: [true, 'minimumOrderQuantity is required'],
      min: [1, 'minimumOrderQuantity must be at least 1'],
      default: 1
    },
    orderMultiple: {
      type: Number,
      required: [true, 'orderMultiple is required'],
      min: [1, 'orderMultiple must be at least 1'],
      default: 1
    },
    purchasePrice: {
      type: Number,
      required: [true, 'purchasePrice is required'],
      min: [0, 'purchasePrice cannot be negative'],
      default: 0.00
    },
    preferredSupplier: {
      type: Boolean,
      required: [true, 'preferredSupplier is required'],
      default: false
    },
    maximumSupplyCapacity: {
      type: Number,
      required: [true, 'maximumSupplyCapacity is required'],
      min: [1, 'maximumSupplyCapacity must be at least 1'],
      default: 999999
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['ACTIVE', 'SUSPENDED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'ACTIVE'
    }
  },
  {
    collection: 'supplier_product_mapping',
    timestamps: true
  }
);

// Compound Indexes
supplierProductMappingSchema.index({ supplierCode: 1, skuCode: 1 }, { unique: true });
supplierProductMappingSchema.index({ skuCode: 1, preferredSupplier: -1, status: 1 });

const SupplierProductMapping = mongoose.models.SupplierProductMapping || mongoose.model('SupplierProductMapping', supplierProductMappingSchema);

export default SupplierProductMapping;
