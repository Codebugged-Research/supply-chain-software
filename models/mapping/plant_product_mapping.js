import mongoose from 'mongoose';

/**
 * plant_product_mapping Schema
 * Plant line qualification matrix mapping SKUs to factory production lines.
 */
const plantProductMappingSchema = new mongoose.Schema(
  {
    plantCode: {
      type: String,
      required: [true, 'plantCode is required'],
      ref: 'PlantMaster',
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
    productionLine: {
      type: String,
      required: [true, 'productionLine is required'],
      trim: true
    },
    dailyCapacity: {
      type: Number,
      required: [true, 'dailyCapacity is required'],
      min: [0, 'dailyCapacity cannot be negative'],
      default: 0
    },
    weeklyCapacity: {
      type: Number,
      required: [true, 'weeklyCapacity is required'],
      min: [0, 'weeklyCapacity cannot be negative'],
      default: 0
    },
    productionRate: {
      type: Number,
      required: [true, 'productionRate is required'],
      min: [0, 'productionRate cannot be negative'],
      default: 10.0
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['QUALIFIED', 'UNDER_QUALIFICATION', 'QUALIFIED_BACKUP'],
        message: '{VALUE} is not a valid status'
      },
      default: 'QUALIFIED'
    }
  },
  {
    collection: 'plant_product_mapping',
    timestamps: true
  }
);

// Compound Indexes
plantProductMappingSchema.index({ plantCode: 1, skuCode: 1, productionLine: 1 }, { unique: true });
plantProductMappingSchema.index({ skuCode: 1, status: 1 });

const PlantProductMapping = mongoose.models.PlantProductMapping || mongoose.model('PlantProductMapping', plantProductMappingSchema);

export default PlantProductMapping;
