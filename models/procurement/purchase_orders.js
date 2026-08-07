import mongoose from 'mongoose';

/**
 * purchase_orders Schema
 * Inbound vendor purchase order lines tracking open purchasing pipeline.
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'poNumber is required'],
      trim: true,
      uppercase: true,
      match: [/^PUR-[A-Z0-9]{8,15}$/, 'Invalid poNumber format']
    },
    supplierCode: {
      type: String,
      required: [true, 'supplierCode is required'],
      ref: 'SupplierMaster',
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
    orderedQty: {
      type: Number,
      required: [true, 'orderedQty is required'],
      min: [1, 'orderedQty must be at least 1'],
      default: 0
    },
    receivedQty: {
      type: Number,
      required: [true, 'receivedQty is required'],
      min: [0, 'receivedQty cannot be negative'],
      default: 0
    },
    expectedDeliveryDate: {
      type: Date,
      required: [true, 'expectedDeliveryDate is required'],
      default: Date.now
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'DRAFT'
    }
  },
  {
    collection: 'purchase_orders',
    timestamps: true
  }
);

// Indexes
purchaseOrderSchema.index({ poNumber: 1, skuCode: 1 }, { unique: true });
purchaseOrderSchema.index({ supplierCode: 1, status: 1, expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ skuCode: 1, status: 1, expectedDeliveryDate: 1 });

const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
