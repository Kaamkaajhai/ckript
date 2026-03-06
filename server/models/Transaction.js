import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ["credit", "debit", "refund", "withdrawal", "subscription", "payment", "bonus", "commission"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "USD"
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "cancelled", "processing"],
    default: "pending",
    index: true
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  // Related entities
  relatedScript: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Script"
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  // Payment gateway details
  paymentMethod: {
    type: String,
    enum: ["stripe", "razorpay", "bank_transfer", "paypal", "wallet", "manual"]
  },
  stripePaymentId: String,
  stripeChargeId: String,
  // Bank transfer details (for withdrawals)
  bankTransferDetails: {
    accountNumber: String,
    routingNumber: String,
    bankName: String,
    accountHolderName: String,
    transferDate: Date,
    transferReference: String
  },
  // Balance tracking
  balanceBefore: Number,
  balanceAfter: Number,
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  notes: String,
  // Admin actions
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  processedAt: Date
}, { 
  timestamps: true 
});

// Indexes for efficient queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

// Virtual for formatted amount
transactionSchema.virtual("formattedAmount").get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.amount);
});

// Method to generate unique reference
transactionSchema.statics.generateReference = function(type) {
  const prefix = type.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export default mongoose.model("Transaction", transactionSchema);
