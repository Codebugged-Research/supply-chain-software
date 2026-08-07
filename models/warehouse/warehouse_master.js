import mongoose from 'mongoose';

/**
 * warehouse_master Schema
 * Distribution centers, warehouses, and storage capacity parameters.
 */
const warehouseMasterSchema = new mongoose.Schema(
  {
    warehouseCode: {
      type: String,
      required: [true, 'warehouseCode is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,10}$/, 'Invalid warehouseCode format']
    },
    warehouseName: {
      type: String,
      required: [true, 'warehouseName is required'],
      trim: true,
      minlength: [3, 'warehouseName must be at least 3 characters'],
      maxlength: [100, 'warehouseName cannot exceed 100 characters']
    },
    warehouseType: {
      type: String,
      required: [true, 'warehouseType is required'],
      enum: {
        values: ['CENTRAL_DC', 'REGIONAL_DC', 'PLANT_WH', '3PL'],
        message: '{VALUE} is not a valid warehouseType'
      },
      default: 'REGIONAL_DC'
    },
    country: {
      type: String,
      required: [true, 'country is required'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Country code must be 2 letters'],
      maxlength: [2, 'Country code must be 2 letters'],
      default: 'IN'
    },
    state: {
      type: String,
      required: [true, 'state is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'city is required'],
      trim: true
    },
    capacityUnits: {
      type: Number,
      required: [true, 'capacityUnits is required'],
      min: [0, 'capacityUnits cannot be negative'],
      default: 0
    },
    storageCost: {
      type: Number,
      required: [true, 'storageCost is required'],
      min: [0, 'storageCost cannot be negative'],
      default: 0.00
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['ACTIVE', 'FULL', 'INACTIVE'],
        message: '{VALUE} is not a valid status'
      },
      default: 'ACTIVE'
    }
  },
  {
    collection: 'warehouse_master',
    timestamps: true
  }
);

// Compound Index
warehouseMasterSchema.index({ warehouseType: 1, status: 1 });

const WarehouseMaster = mongoose.models.WarehouseMaster || mongoose.model('WarehouseMaster', warehouseMasterSchema);

export default WarehouseMaster;
