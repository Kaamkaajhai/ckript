import Tag from "../models/Tag.js";

// @desc    Get all tags (with optional filtering by type)
// @route   GET /api/tags
// @access  Public
export const getTags = async (req, res) => {
  try {
    const { type, search } = req.query;
    
    let query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const tags = await Tag.find(query).sort({ usageCount: -1, name: 1 });
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Create a new tag
// @route   POST /api/tags
// @access  Private (Admin only, but can be opened for user suggestions)
export const createTag = async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type 
    });
    
    if (existingTag) {
      return res.status(400).json({ 
        success: false, 
        message: "Tag already exists" 
      });
    }
    
    const tag = await Tag.create({ name, type, description });
    
    res.status(201).json({ success: true, tag });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get tags grouped by type
// @route   GET /api/tags/grouped
// @access  Public
export const getTagsGrouped = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ type: 1, name: 1 });
    
    const grouped = tags.reduce((acc, tag) => {
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    }, {});
    
    res.json({ success: true, tags: grouped });
  } catch (error) {
    console.error("Error fetching grouped tags:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Increment tag usage count
// @route   PUT /api/tags/:id/increment
// @access  Private
export const incrementTagUsage = async (req, res) => {
  try {
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );
    
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        message: "Tag not found" 
      });
    }
    
    res.json({ success: true, tag });
  } catch (error) {
    console.error("Error incrementing tag usage:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Seed initial tags
// @route   POST /api/tags/seed
// @access  Private (Admin only)
export const seedTags = async (req, res) => {
  try {
    const initialTags = [
      // GENRE
      { name: "Action", type: "GENRE" },
      { name: "Comedy", type: "GENRE" },
      { name: "Drama", type: "GENRE" },
      { name: "Horror", type: "GENRE" },
      { name: "Thriller", type: "GENRE" },
      { name: "Sci-Fi", type: "GENRE" },
      { name: "Fantasy", type: "GENRE" },
      { name: "Romance", type: "GENRE" },
      { name: "Mystery", type: "GENRE" },
      { name: "Western", type: "GENRE" },
      
      // SUB_GENRE
      { name: "Romantic Comedy", type: "SUB_GENRE" },
      { name: "Dark Comedy", type: "SUB_GENRE" },
      { name: "Slapstick", type: "SUB_GENRE" },
      { name: "Psychological Thriller", type: "SUB_GENRE" },
      { name: "Crime Drama", type: "SUB_GENRE" },
      { name: "Space Opera", type: "SUB_GENRE" },
      
      // TONE
      { name: "Inspiring", type: "TONE" },
      { name: "Bleak", type: "TONE" },
      { name: "Quirky", type: "TONE" },
      { name: "Fast-Paced", type: "TONE" },
      { name: "Slow-Burn", type: "TONE" },
      { name: "Intense", type: "TONE" },
      { name: "Lighthearted", type: "TONE" },
      { name: "Dark", type: "TONE" },
      { name: "Uplifting", type: "TONE" },
      
      // THEME
      { name: "Revenge", type: "THEME" },
      { name: "Coming of Age", type: "THEME" },
      { name: "Artificial Intelligence", type: "THEME" },
      { name: "Politics", type: "THEME" },
      { name: "Family", type: "THEME" },
      { name: "Love", type: "THEME" },
      { name: "Redemption", type: "THEME" },
      { name: "Identity", type: "THEME" },
      { name: "Survival", type: "THEME" },
      { name: "Justice", type: "THEME" },
      
      // LOCATION
      { name: "New York", type: "LOCATION" },
      { name: "Los Angeles", type: "LOCATION" },
      { name: "Space", type: "LOCATION" },
      { name: "Desert", type: "LOCATION" },
      { name: "Suburbs", type: "LOCATION" },
      { name: "Small Town", type: "LOCATION" },
      { name: "Underwater", type: "LOCATION" },
      { name: "Foreign Country", type: "LOCATION" },
      
      // ERA
      { name: "Present Day", type: "ERA" },
      { name: "1980s", type: "ERA" },
      { name: "1990s", type: "ERA" },
      { name: "Future", type: "ERA" },
      { name: "Victorian", type: "ERA" },
      { name: "Medieval", type: "ERA" },
      { name: "World War II", type: "ERA" },
      
      // FORMAT
      { name: "Feature Film", type: "FORMAT" },
      { name: "TV Pilot (1-Hour)", type: "FORMAT" },
      { name: "TV Pilot (1/2-Hour)", type: "FORMAT" },
      { name: "Play", type: "FORMAT" },
      { name: "Short Film", type: "FORMAT" },
    ];
    
    // Clear existing tags (optional - remove in production)
    // await Tag.deleteMany({});
    
    // Insert tags, ignoring duplicates
    const results = [];
    for (const tagData of initialTags) {
      try {
        const tag = await Tag.create(tagData);
        results.push(tag);
      } catch (error) {
        // Skip duplicates
        if (error.code !== 11000) {
          console.error(`Error creating tag ${tagData.name}:`, error);
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Seeded ${results.length} tags`,
      tags: results
    });
  } catch (error) {
    console.error("Error seeding tags:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
