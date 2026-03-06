import "dotenv/config";
import connectDB from "./config/db.js";
import Script from "./models/Script.js";

await connectDB();

const count = await Script.countDocuments({ status: "published" });
const sample = await Script.find({ status: "published" })
  .limit(5)
  .select("title status rating reviewCount readsCount views isFeatured");

console.log("Total published:", count);
console.log("Sample docs:");
sample.forEach(s =>
  console.log(` - "${s.title}" | rating:${s.rating} | reviews:${s.reviewCount} | reads:${s.readsCount} | views:${s.views} | featured:${s.isFeatured}`)
);

// Simulate the aggregation
const agg = await Script.aggregate([
  { $match: { status: "published" } },
  {
    $addFields: {
      trendScore: {
        $add: [
          { $multiply: [{ $ifNull: ["$reviewCount", 0] }, 3] },
          { $multiply: [{ $ifNull: ["$readsCount", 0] }, 2] },
          { $ifNull: ["$views", 0] },
        ],
      },
    },
  },
  { $sort: { trendScore: -1 } },
  { $limit: 12 },
  { $project: { title: 1, trendScore: 1, status: 1 } },
]);

console.log("\nAggregation result (top 12):");
agg.forEach(s => console.log(` - "${s.title}" | trendScore:${s.trendScore}`));

process.exit(0);
