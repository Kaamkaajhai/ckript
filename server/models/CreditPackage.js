import mongoose from "mongoose";

const creditPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "USD"
  },
  discount: {
    type: Number,
    default: 0
  },
  popular: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  description: String,
  features: [String],
  bonusCredits: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true 
});

// Virtual for total credits including bonus
creditPackageSchema.virtual("totalCredits").get(function() {
  return this.credits + (this.bonusCredits || 0);
});

// Virtual for price per credit
creditPackageSchema.virtual("pricePerCredit").get(function() {
  return (this.price / this.totalCredits).toFixed(2);
});

export default mongoose.model("CreditPackage", creditPackageSchema);
