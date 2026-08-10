const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;
mongoose.connect(uri).then(async () => {
  const coll = mongoose.connection.collection('scripts');
  const scriptId = "6a4833f39075fb0d246f1b19"; // check upload (published)
  const script = await coll.findOne({ _id: new mongoose.Types.ObjectId(scriptId) });
  console.log("Found script:", script ? script.title : "No");

  const query = {
    status: { $in: ['published', 'approved'] },
    isDeleted: { $ne: true },
    isSold: { $ne: true },
    transactionStatus: { $ne: "sold_licensed" },
    _id: { $ne: script._id },
  };

  if (script.genre) query.genre = script.genre;
  if (script.contentType) query.contentType = script.contentType;
  
  let similar = await coll.find(query).limit(4).toArray();
  console.log("Initial similar:", similar.length);
  
  if (similar.length < 4 && script.contentType) {
    delete query.contentType;
    query._id = { $nin: [script._id, ...similar.map(s => s._id)] };
    const moreSimilar = await coll.find(query).limit(4 - similar.length).toArray();
    similar = [...similar, ...moreSimilar];
    console.log("After genre fallback:", similar.length);
  }

  if (similar.length < 4) {
    delete query.genre;
    query._id = { $nin: [script._id, ...similar.map(s => s._id)] };
    const evenMore = await coll.find(query).limit(4 - similar.length).toArray();
    similar = [...similar, ...evenMore];
    console.log("After ANY fallback:", similar.length);
  }
  
  console.log("Final similar scripts:", similar.map(s => s.title));
  process.exit(0);
}).catch(console.error);
