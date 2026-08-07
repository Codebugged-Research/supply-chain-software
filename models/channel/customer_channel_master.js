import mongoose from 'mongoose';

/**
 * customer_channel_master Schema
 * Sales channels, target inventory cover, and order allocation priorities.
 */
const customerChannelMasterSchema = new mongoose.Schema(
  {
    channelCode: {
      type: String,
      required: [true, 'channelCode is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9_-]{2,10}$/, 'Invalid channelCode format']
    },
    channelName: {
      type: String,
      required: [true, 'channelName is required'],
      trim: true,
      minlength: [2, 'channelName must be at least 2 characters'],
      maxlength: [100, 'channelName cannot exceed 100 characters']
    },
    channelType: {
      type: String,
      required: [true, 'channelType is required'],
      enum: {
        values: ['ECOMMERCE', 'MODERN_TRADE', 'GENERAL_TRADE', 'EXPORTS'],
        message: '{VALUE} is not a valid channelType'
      },
      default: 'GENERAL_TRADE'
    },
    priority: {
      type: Number,
      required: [true, 'priority is required'],
      min: [1, 'priority must be at least 1'],
      max: [10, 'priority cannot exceed 10'],
      default: 5
    },
    serviceLevel: {
      type: Number,
      required: [true, 'serviceLevel is required'],
      min: [80.0, 'serviceLevel must be at least 80.0'],
      max: [99.9, 'serviceLevel cannot exceed 99.9'],
      default: 95.0
    },
    defaultInventoryDays: {
      type: Number,
      required: [true, 'defaultInventoryDays is required'],
      min: [0, 'defaultInventoryDays cannot be negative'],
      default: 7
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['ACTIVE', 'INACTIVE'],
        message: '{VALUE} is not a valid status'
      },
      default: 'ACTIVE'
    }
  },
  {
    collection: 'customer_channel_master',
    timestamps: true
  }
);

// Compound Index
customerChannelMasterSchema.index({ channelType: 1, priority: 1 });

const CustomerChannelMaster = mongoose.models.CustomerChannelMaster || mongoose.model('CustomerChannelMaster', customerChannelMasterSchema);

export default CustomerChannelMaster;
