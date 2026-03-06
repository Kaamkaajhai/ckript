import mongoose from "mongoose";
import dotenv from "dotenv";
import CreditPackage from "./models/CreditPackage.js";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const creditPackages = [
  {
    name: "Starter Pack",
    credits: 10,
    price: 799,
    currency: "INR",
    description: "Perfect for trying out our AI services",
    features: [
      "1 AI Evaluation",
      "2 Basic Analyses",
      "Valid for 6 months"
    ],
    bonusCredits: 0,
    popular: false
  },
  {
    name: "Professional",
    credits: 50,
    price: 3499,
    currency: "INR",
    discount: 10,
    description: "Best value for active writers",
    features: [
      "5 AI Evaluations",
      "3 AI Trailers",
      "10 Basic Analyses",
      "Valid for 1 year"
    ],
    bonusCredits: 5,
    popular: true
  },
  {
    name: "Premium",
    credits: 100,
    price: 6299,
    currency: "INR",
    discount: 20,
    description: "Maximum credits for serious creators",
    features: [
      "10 AI Evaluations",
      "6 AI Trailers",
      "20 Basic Analyses",
      "2 Premium Reports",
      "Valid for 1 year",
      "Priority Support"
    ],
    bonusCredits: 15,
    popular: false
  },
  {
    name: "Enterprise",
    credits: 250,
    price: 14999,
    currency: "INR",
    discount: 30,
    description: "For production companies and agencies",
    features: [
      "25 AI Evaluations",
      "15 AI Trailers",
      "50 Basic Analyses",
      "5 Premium Reports",
      "3 Consultations",
      "Valid for 2 years",
      "Dedicated Account Manager"
    ],
    bonusCredits: 50,
    popular: false
  }
];

const seedCreditPackages = async () => {
  try {
    // Clear existing packages
    await CreditPackage.deleteMany();
    console.log("Existing credit packages cleared");

    // Insert new packages
    const created = await CreditPackage.insertMany(creditPackages);
    console.log(`${created.length} credit packages created successfully`);

    created.forEach(pkg => {
      console.log(`- ${pkg.name}: ${pkg.credits} credits (+${pkg.bonusCredits} bonus) for ₹${pkg.price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding credit packages:", error);
    process.exit(1);
  }
};

seedCreditPackages();
