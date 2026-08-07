import mongoose from 'mongoose';

/**
 * supplier_master Schema
 * Vendor master profiles, default lead times, and performance ratings.
 */
const supplierMasterSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      required: [true, 'supplierCode is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,15}$/, 'Invalid supplierCode format']
    },
    supplierName: {
      type: String,
      required: [true, 'supplierName is required'],
      trim: true,
      minlength: [3, 'supplierName must be at least 3 characters'],
      maxlength: [150, 'supplierName cannot exceed 150 characters']
    },
    country: {
      type: String,
      required: [true, 'country is required'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Country code must be 2 letters'],
      maxlength: [2, 'Country code must be 2 letters']
    },
    city: {
      type: String,
      required: [true, 'city is required'],
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true,
      default: null
    },
    rating: {
      type: Number,
      required: [true, 'rating is required'],
      min: [1.0, 'rating must be at least 1.0'],
      max: [5.0, 'rating cannot exceed 5.0'],
      default: 3.0
    },
    qualityScore: {
      type: Number,
      required: [true, 'qualityScore is required'],
      min: [0.0, 'qualityScore cannot be negative'],
      max: [100.0, 'qualityScore cannot exceed 100.0'],
      default: 90.0
    },
    onTimeDelivery: {
      type: Number,
      required: [true, 'onTimeDelivery is required'],
      min: [0.0, 'onTimeDelivery cannot be negative'],
      max: [100.0, 'onTimeDelivery cannot exceed 100.0'],
      default: 85.0
    },
    defaultLeadTimeDays: {
      type: Number,
      required: [true, 'defaultLeadTimeDays is required'],
      min: [1, 'defaultLeadTimeDays must be at least 1 day'],
      default: 14
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['APPROVED', 'BLACK_LISTED', 'UNDER_REVIEW'],
        message: '{VALUE} is not a valid status'
      },
      default: 'APPROVED'
    }
  },
  {
    collection: 'supplier_master',
    timestamps: true
  }
);

// Compound Index
supplierMasterSchema.index({ status: 1, rating: -1 });

const SupplierMaster = mongoose.models.SupplierMaster || mongoose.model('SupplierMaster', supplierMasterSchema);

export default SupplierMaster;
