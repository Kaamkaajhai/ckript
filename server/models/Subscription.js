import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  script: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Script" 
  },
  plan: { 
    type: String, 
    enum: ["hosting", "hosting_plus_evaluation"],
    default: "hosting"
  },
  status: { 
    type: String, 
    enum: ["active", "cancelled", "past_due", "pending"],
    default: "pending"
  },
  amount: { type: Number, required: true }, // In cents
  currency: { type: String, default: "USD" },
  
  // Billing cycle
  billingCycle: { 
    type: String, 
    enum: ["monthly", "annual"],
    default: "monthly"
  },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  nextBillingDate: { type: Date },
  
  // Payment provider data
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  stripePaymentMethodId: { type: String },
  
  // Additional services
  includesEvaluation: { type: Boolean, default: false },
  evaluationCompleted: { type: Boolean, default: false },
  evaluationCompletedAt: { type: Date },
  
  // Submission agreement
  submissionAgreementAccepted: { type: Boolean, default: false },
  submissionAgreementAcceptedAt: { type: Date },
  submissionAgreementIp: { type: String },
  
  cancelledAt: { type: Date },
  cancelReason: { type: String },
}, { timestamps: true });

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, status: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
