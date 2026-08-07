import mongoose from 'mongoose';

/**
 * product_master Schema
 * Core product master catalog defining physical and logical SKU attributes.
 */
const productMasterSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,30}$/, 'Invalid skuCode format']
    },
    skuName: {
      type: String,
      required: [true, 'skuName is required'],
      trim: true,
      minlength: [3, 'skuName must be at least 3 characters'],
      maxlength: [150, 'skuName cannot exceed 150 characters']
    },
    shortName: {
      type: String,
      trim: true,
      maxlength: [50, 'shortName cannot exceed 50 characters'],
      default: null
    },
    brand: {
      type: String,
      required: [true, 'brand is required'],
      trim: true,
      minlength: [2, 'brand must be at least 2 characters']
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      trim: true
    },
    subCategory: {
      type: String,
      required: [true, 'subCategory is required'],
      trim: true
    },
    productFamily: {
      type: String,
      trim: true,
      default: null
    },
    productSeries: {
      type: String,
      trim: true,
      default: null
    },
    modelNumber: {
      type: String,
      trim: true,
      default: null
    },
    color: {
      type: String,
      trim: true,
      default: null
    },
    variant: {
      type: String,
      trim: true,
      default: null
    },
    technologyGeneration: {
      type: String,
      enum: {
        values: ['5G', '4G', 'OLED', 'LED', 'GEN3'],
        message: '{VALUE} is not a valid technologyGeneration'
      },
      default: null
    },
    replacementSku: {
      type: String,
      ref: 'ProductMaster',
      default: null
    },
    barcode: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      match: [/^\d{12,13}$/, 'Barcode must be 12 or 13 digits'],
      default: null
    },
    hsnCode: {
      type: String,
      required: [true, 'hsnCode is required'],
      trim: true,
      match: [/^\d{4,8}$/, 'hsnCode must be 4 to 8 digits']
    },
    unitOfMeasure: {
      type: String,
      required: [true, 'unitOfMeasure is required'],
      enum: {
        values: ['EA', 'KG', 'LTR', 'BOX', 'PALLET'],
        message: '{VALUE} is not a valid unitOfMeasure'
      },
      default: 'EA'
    },
    lifecycleStage: {
      type: String,
      required: [true, 'lifecycleStage is required'],
      enum: {
        values: ['NPI', 'GROWTH', 'MATURE', 'DECLINE', 'EOL'],
        message: '{VALUE} is not a valid lifecycleStage'
      },
      default: 'GROWTH'
    },
    launchDate: {
      type: Date,
      required: [true, 'launchDate is required'],
      default: Date.now
    },
    plannedEOLDate: {
      type: Date,
      default: null
    },
    warrantyMonths: {
      type: Number,
      min: [0, 'warrantyMonths cannot be negative'],
      max: [120, 'warrantyMonths cannot exceed 120'],
      default: 12
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'ACTIVE'
    }
  },
  {
    collection: 'product_master',
    timestamps: true
  }
);

// Compound Indexes
productMasterSchema.index({ category: 1, subCategory: 1, status: 1 });
productMasterSchema.index({ brand: 1, status: 1 });

const ProductMaster = mongoose.models.ProductMaster || mongoose.model('ProductMaster', productMasterSchema);

export default ProductMaster;
