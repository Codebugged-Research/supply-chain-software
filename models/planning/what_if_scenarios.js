import mongoose from 'mongoose';

/**
 * what_if_scenarios Schema
 * Simulation scenario container holding parameters and linked supply plan outputs.
 */
const whatIfScenarioSchema = new mongoose.Schema(
  {
    scenarioName: {
      type: String,
      required: [true, 'scenarioName is required'],
      trim: true,
      minlength: [3, 'scenarioName must be at least 3 characters'],
      maxlength: [100, 'scenarioName cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'description cannot exceed 500 characters'],
      default: null
    },
    createdBy: {
      type: String,
      required: [true, 'createdBy is required'],
      trim: true
    },
    assumptionType: {
      type: String,
      required: [true, 'assumptionType is required'],
      enum: {
        values: ['DEMAND_SURGE', 'SUPPLIER_SHUTDOWN', 'CAPACITY_DROP', 'LEAD_TIME_SPIKE'],
        message: '{VALUE} is not a valid assumptionType'
      }
    },
    assumptionValue: {
      type: Number,
      required: [true, 'assumptionValue is required'],
      default: 0.0
    },
    generatedSupplyPlanId: {
      type: String,
      required: [true, 'generatedSupplyPlanId is required'],
      ref: 'SupplyPlan',
      trim: true
    },
    createdAt: {
      type: Date,
      required: [true, 'createdAt is required'],
      default: Date.now
    }
  },
  {
    collection: 'what_if_scenarios',
    timestamps: true
  }
);

// Indexes
whatIfScenarioSchema.index({ generatedSupplyPlanId: 1 }, { sparse: true });
whatIfScenarioSchema.index({ createdBy: 1, createdAt: -1 });
whatIfScenarioSchema.index({ scenarioName: 1 });

const WhatIfScenario = mongoose.models.WhatIfScenario || mongoose.model('WhatIfScenario', whatIfScenarioSchema);

export default WhatIfScenario;
