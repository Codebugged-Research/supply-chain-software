import mongoose from 'mongoose';

/**
 * consensus_forecast Schema
 * Unconstrained consensus demand forecast driving MRP gross demand netting.
 */
const consensusForecastSchema = new mongoose.Schema(
  {
    skuCode: {
      type: String,
      required: [true, 'skuCode is required'],
      ref: 'ProductMaster',
      trim: true,
      uppercase: true
    },
    location: {
      type: String,
      required: [true, 'location is required'],
      trim: true,
      uppercase: true
    },
    week: {
      type: String,
      required: [true, 'week is required'],
      trim: true,
      match: [/^\d{4}-W\d{2}$/, 'week must be in YYYY-Www format']
    },
    forecastQty: {
      type: Number,
      required: [true, 'forecastQty is required'],
      min: [0, 'forecastQty cannot be negative'],
      default: 0
    },
    forecastVersion: {
      type: String,
      required: [true, 'forecastVersion is required'],
      trim: true,
      match: [/^v\d+\.\d+$/, 'forecastVersion must be in vX.Y format'],
      default: 'v1.0'
    },
    approvedBy: {
      type: String,
      required: [true, 'approvedBy is required'],
      trim: true
    },
    approvedDate: {
      type: Date,
      required: [true, 'approvedDate is required'],
      default: Date.now
    }
  },
  {
    collection: 'consensus_forecast',
    timestamps: true
  }
);

// Indexes
consensusForecastSchema.index({ skuCode: 1, location: 1, week: 1, forecastVersion: 1 }, { unique: true });
consensusForecastSchema.index({ week: 1, skuCode: 1 });

const ConsensusForecast = mongoose.models.ConsensusForecast || mongoose.model('ConsensusForecast', consensusForecastSchema);

export default ConsensusForecast;
