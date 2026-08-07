import mongoose from 'mongoose';

/**
 * inventory Schema
 * Real-time stock tracking by SKU, location (warehouse/plant), and batch number.
 */
const inventorySchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    warehouseCode: {
      type: String,
      ref: 'WarehouseMaster',
      trim: true,
      uppercase: true,
      default: null
    },
    plantCode: {
      type: String,
      ref: 'PlantMaster',
      trim: true,
      uppercase: true,
      default: null
    },
    batchNumber: {
      type: String,
      required: [true, 'batchNumber is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,30}$/, 'Invalid batchNumber format'],
      default: 'DEFAULT'
    },
    availableQty: {
      type: Number,
      required: [true, 'availableQty is required'],
      min: [0, 'availableQty cannot be negative'],
      default: 0
    },
    reservedQty: {
      type: Number,
      required: [true, 'reservedQty is required'],
      min: [0, 'reservedQty cannot be negative'],
      default: 0
    },
    blockedQty: {
      type: Number,
      required: [true, 'blockedQty is required'],
      min: [0, 'blockedQty cannot be negative'],
      default: 0
    },
    inTransitQty: {
      type: Number,
      required: [true, 'inTransitQty is required'],
      min: [0, 'inTransitQty cannot be negative'],
      default: 0
    },
    qualityInspectionQty: {
      type: Number,
      required: [true, 'qualityInspectionQty is required'],
      min: [0, 'qualityInspectionQty cannot be negative'],
      default: 0
    },
    openingQty: {
      type: Number,
      required: [true, 'openingQty is required'],
      min: [0, 'openingQty cannot be negative'],
      default: 0
    },
    closingQty: {
      type: Number,
      required: [true, 'closingQty is required'],
      min: [0, 'closingQty cannot be negative'],
      default: 0
    },
    lastUpdated: {
      type: Date,
      required: [true, 'lastUpdated is required'],
      default: Date.now
    }
  },
  {
    collection: 'inventory',
    timestamps: true
  }
);

// Indexes
inventorySchema.index({ skuCode: 1, warehouseCode: 1, plantCode: 1, batchNumber: 1 }, { unique: true });
inventorySchema.index({ warehouseCode: 1, skuCode: 1, availableQty: 1 });
inventorySchema.index({ plantCode: 1, skuCode: 1 });
inventorySchema.index({ lastUpdated: -1 });

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export default Inventory;
