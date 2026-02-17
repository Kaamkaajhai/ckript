import mongoose from "mongoose";

const tagSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  type: { 
    type: String, 
    enum: [
      'GENRE',           // Action, Comedy, Drama, etc.
      'SUB_GENRE',       // Romantic Comedy, Dark Comedy, etc.
      'TONE',            // Inspiring, Bleak, Quirky, Fast-Paced, etc.
      'THEME',           // Revenge, Coming of Age, AI, Politics, etc.
      'LOCATION',        // New York, Space, Desert, etc.
      'ERA',             // Present Day, 1980s, Future, etc.
      'FORMAT'           // Feature Film, TV Pilot, etc.
    ],
    required: true 
  },
  description: { type: String },
  usageCount: { type: Number, default: 0 }, // Track popularity
}, { timestamps: true });

// Index for fast searching
tagSchema.index({ name: 'text', type: 1 });

export default mongoose.model("Tag", tagSchema);
