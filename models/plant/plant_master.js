import mongoose from 'mongoose';

/**
 * plant_master Schema
 * Manufacturing plant locations, shift capacity, and operational calendar.
 */
const plantMasterSchema = new mongoose.Schema(
  {
    plantCode: {
      type: String,
      required: [true, 'plantCode is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{3,10}$/, 'Invalid plantCode format']
    },
    plantName: {
      type: String,
      required: [true, 'plantName is required'],
      trim: true,
      minlength: [3, 'plantName must be at least 3 characters'],
      maxlength: [100, 'plantName cannot exceed 100 characters']
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
    timezone: {
      type: String,
      required: [true, 'timezone is required'],
      trim: true,
      default: 'Asia/Kolkata'
    },
    workingDays: {
      type: Number,
      required: [true, 'workingDays is required'],
      min: [1, 'workingDays must be at least 1'],
      max: [7, 'workingDays cannot exceed 7'],
      default: 6
    },
    workingShifts: {
      type: Number,
      required: [true, 'workingShifts is required'],
      min: [1, 'workingShifts must be at least 1'],
      max: [3, 'workingShifts cannot exceed 3'],
      default: 2
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
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'],
        message: '{VALUE} is not a valid status'
      },
      default: 'ACTIVE'
    }
  },
  {
    collection: 'plant_master',
    timestamps: true
  }
);

// Compound Index
plantMasterSchema.index({ status: 1, country: 1 });

const PlantMaster = mongoose.models.PlantMaster || mongoose.model('PlantMaster', plantMasterSchema);

export default PlantMaster;
