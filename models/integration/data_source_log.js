import mongoose from 'mongoose';

/**
 * data_source_log Schema
 * Logs data ingestion feeds, integration status, sync health, and record counts.
 */
const dataSourceLogSchema = new mongoose.Schema(
  {
    sourceId: {
      type: String,
      required: [true, 'sourceId is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    sourceName: {
      type: String,
      required: [true, 'sourceName is required'],
      trim: true
    },
    sourceType: {
      type: String,
      required: [true, 'sourceType is required'],
      enum: {
        values: ['API_SYNC', 'CSV_IMPORT', 'MONGO_COLLECTION', 'ERP_SAP', 'WMS_SYNC'],
        message: '{VALUE} is not a valid sourceType'
      },
      default: 'MONGO_COLLECTION'
    },
    lastSyncTime: {
      type: Date,
      required: [true, 'lastSyncTime is required'],
      default: Date.now
    },
    recordCount: {
      type: Number,
      required: [true, 'recordCount is required'],
      min: [0, 'recordCount cannot be negative'],
      default: 0
    },
    healthStatus: {
      type: String,
      required: [true, 'healthStatus is required'],
      enum: {
        values: ['HEALTHY', 'DEGRADED', 'FAILED'],
        message: '{VALUE} is not a valid healthStatus'
      },
      default: 'HEALTHY'
    },
    errorLog: {
      type: String,
      trim: true,
      default: null
    },
    syncFrequency: {
      type: String,
      trim: true,
      default: 'Real-time / Hourly'
    }
  },
  {
    collection: 'data_source_logs',
    timestamps: true
  }
);

dataSourceLogSchema.index({ healthStatus: 1, lastSyncTime: -1 });

const DataSourceLog = mongoose.models.DataSourceLog || mongoose.model('DataSourceLog', dataSourceLogSchema);

export default DataSourceLog;
