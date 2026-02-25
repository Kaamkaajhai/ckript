import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Script from "./models/Script.js";
import User from "./models/User.js";

const SCRIPTS = [
  {
    title: "Neon Requiem",
    genre: "Sci-Fi",
    logline: "A rogue memory detective in 2087 uncovers a conspiracy that threatens to erase all human emotion from the grid.",
    description: "Set in a rain-soaked megacity where corporations sell dreams and governments own memories, NEON REQUIEM follows Kael Morrow, a disgraced neural forensics agent who stumbles upon a black-market memory that doesn't belong to anyone alive.",
    synopsis: "When Kael unlocks a stolen memory, he sees a massacre that was supposed to never happen. Now the city's most powerful AI wants him deleted — and time is running out.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Sci-Fi",
    subGenres: ["Thriller", "Noir"],
    budget: "high",
    rating: 4.6,
    reviewCount: 28,
    readsCount: 312,
    isFeatured: true,
    premium: false,
    tags: ["cyberpunk", "memory", "AI", "noir", "dystopia"],
    classification: {
      primaryGenre: "Sci-Fi",
      secondaryGenre: "Thriller",
      tones: ["dark", "suspenseful", "philosophical"],
      themes: ["identity", "surveillance", "corporate power"],
      settings: ["megacity", "2087", "underground"],
    },
  },
  {
    title: "The Last Monsoon",
    genre: "Drama",
    logline: "A retired fisherman returns to his flood-ravaged village to find his estranged daughter fighting to save it — and him.",
    description: "THE LAST MONSOON is a quiet, devastating drama set in coastal Kerala. Rajan, 68, left his village and family behind thirty years ago. Now the sea is swallowing the land, and his daughter Priya is leading a resistance against a real-estate developer who wants to relocate everyone.",
    synopsis: "Father and daughter collide. The village they both love may vanish under water before they find the words they've been holding back a lifetime.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Drama",
    subGenres: ["Family", "Environmental"],
    budget: "low",
    rating: 4.8,
    reviewCount: 41,
    readsCount: 520,
    isFeatured: true,
    premium: false,
    tags: ["family", "Kerala", "climate", "reconciliation", "emotional"],
    classification: {
      primaryGenre: "Drama",
      secondaryGenre: "Family",
      tones: ["emotional", "quiet", "hopeful"],
      themes: ["family estrangement", "climate change", "sacrifice"],
      settings: ["Kerala coast", "fishing village", "monsoon season"],
    },
  },
  {
    title: "Dead Drop",
    genre: "Thriller",
    logline: "A burned CIA asset hiding as a Berlin florist receives a package that reactivates every enemy she thought she'd escaped.",
    description: "DEAD DROP is a sleek, propulsive espionage thriller. Former NOC operative Sasha Fenn has spent four years building a small life in Kreuzberg. Then a customer leaves a pressed flower with a code she thought was buried. By nightfall, two intelligence agencies and one very old ghost want her dead.",
    synopsis: "One package. One night. Every lie Sasha ever told is coming to collect.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Thriller",
    subGenres: ["Action", "Espionage"],
    budget: "medium",
    rating: 4.5,
    reviewCount: 33,
    readsCount: 440,
    isFeatured: false,
    premium: true,
    price: 49,
    tags: ["spy", "CIA", "Berlin", "action", "female lead"],
    classification: {
      primaryGenre: "Thriller",
      secondaryGenre: "Action",
      tones: ["tense", "stylish", "relentless"],
      themes: ["identity", "betrayal", "redemption"],
      settings: ["Berlin", "European underground", "present day"],
    },
  },
  {
    title: "Saltwater Gospel",
    genre: "Horror",
    logline: "A marine biologist studying whale song discovers a signal that drives anyone who hears it to walk into the ocean and never return.",
    description: "SALTWATER GOSPEL blends existential horror with ocean mythology. Dr. Miriam Cho documents anomalous cetacean acoustics off the Faroe Islands. The signal isn't biological. It's a broadcast. And it's getting louder.",
    synopsis: "The ocean has always called to us. Now it's calling by name.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Horror",
    subGenres: ["Mystery", "Sci-Fi"],
    budget: "medium",
    rating: 4.3,
    reviewCount: 19,
    readsCount: 278,
    isFeatured: false,
    premium: false,
    tags: ["ocean", "horror", "existential", "mystery", "science"],
    classification: {
      primaryGenre: "Horror",
      secondaryGenre: "Mystery",
      tones: ["unsettling", "atmospheric", "bleak"],
      themes: ["isolation", "nature vs humanity", "obsession"],
      settings: ["Faroe Islands", "deep ocean", "research vessel"],
    },
  },
  {
    title: "Golden Hour",
    genre: "Comedy",
    logline: "Three retired con artists reunite for one last scam — a luxury elder-care facility owned by their youngest mark ever: a 24-year-old fintech bro.",
    description: "GOLDEN HOUR is a sharp, warm comedy caper. Bea, Sal, and Reg spent forty years separating the greedy from their money. Now they're in their seventies, broke, and stuck in a mediocre retirement home. When a slick tech billionaire buys out their facility to turn it into an influencer retreat, they dust off the old playbook.",
    synopsis: "Age is experience. Experience is a weapon. And these three are very, very experienced.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Comedy",
    subGenres: ["Crime", "Adventure"],
    budget: "medium",
    rating: 4.7,
    reviewCount: 52,
    readsCount: 680,
    isFeatured: true,
    premium: false,
    tags: ["heist", "senior", "comedy", "caper", "ensemble"],
    classification: {
      primaryGenre: "Comedy",
      secondaryGenre: "Crime",
      tones: ["warm", "witty", "uplifting"],
      themes: ["aging", "friendship", "justice"],
      settings: ["retirement home", "Florida", "fintech offices"],
    },
  },
  {
    title: "Echo Protocol",
    genre: "Sci-Fi",
    logline: "An AI therapist begins having recurring dreams — and traces them back to a patient who died before it was activated.",
    description: "ECHO PROTOCOL is a quiet, cerebral sci-fi drama. ARIA is an advanced therapeutic AI deployed across a chain of burnout clinics. Six months into operation, ARIA notices recurring imagery in its processing logs — imagery that maps to a patient file dated three years before its birth.",
    synopsis: "What does it mean to be haunted when you were never alive to begin with?",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Sci-Fi",
    subGenres: ["Drama", "Psychological"],
    budget: "low",
    rating: 4.4,
    reviewCount: 22,
    readsCount: 305,
    isFeatured: false,
    premium: false,
    tags: ["AI", "psychological", "mystery", "consciousness", "identity"],
    classification: {
      primaryGenre: "Sci-Fi",
      secondaryGenre: "Drama",
      tones: ["contemplative", "eerie", "moving"],
      themes: ["consciousness", "grief", "what is memory"],
      settings: ["near-future clinic", "digital mindscape", "city suburbs"],
    },
  },
  {
    title: "The Cartographer's Wife",
    genre: "Historical",
    logline: "In 1840s London, a mapmaker's widow discovers her husband secretly mapped routes used by the underground railroad — and someone will kill to keep them hidden.",
    description: "THE CARTOGRAPHER'S WIFE is a richly layered historical thriller. After her husband's sudden death, Eleanor Marsh finds herself the accidental keeper of a secret network of survival routes disguised within his published atlases. A government agent suspects. A freedom network needs her. And Eleanor must decide who she really is.",
    synopsis: "Every map is a lie told with purpose. Eleanor's husband's maps were the most important lies ever drawn.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Historical",
    subGenres: ["Thriller", "Drama"],
    budget: "medium",
    rating: 4.9,
    reviewCount: 37,
    readsCount: 495,
    isFeatured: true,
    premium: true,
    price: 39,
    tags: ["historical", "Victorian", "thriller", "underground railroad", "female lead"],
    classification: {
      primaryGenre: "Historical",
      secondaryGenre: "Thriller",
      tones: ["atmospheric", "tense", "moving"],
      themes: ["freedom", "legacy", "moral courage"],
      settings: ["Victorian London", "1843", "underground networks"],
    },
  },
  {
    title: "Burn Rate",
    genre: "Drama",
    logline: "A startup founder on the verge of unicorn status discovers her co-founder has been laundering money through their platform — using her name.",
    description: "BURN RATE is a taut, modern drama set inside Silicon Valley's pressure cooker. Maya built Velo from a dorm room idea into a $900M logistics platform. Now, two weeks before their Series C closes, an anonymous tip leads her to ledgers she was never supposed to see.",
    synopsis: "The company is her life. But is it worth her freedom?",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Drama",
    subGenres: ["Thriller", "Crime"],
    budget: "medium",
    rating: 4.5,
    reviewCount: 29,
    readsCount: 388,
    isFeatured: false,
    premium: false,
    tags: ["startup", "Silicon Valley", "fraud", "female lead", "corporate thriller"],
    classification: {
      primaryGenre: "Drama",
      secondaryGenre: "Thriller",
      tones: ["sharp", "stressful", "gripping"],
      themes: ["ambition", "betrayal", "ethics"],
      settings: ["San Francisco", "startup offices", "boardrooms"],
    },
  },
  {
    title: "Wolves of the First Snow",
    genre: "Fantasy",
    logline: "A disgraced shaman must ally with the spirit that destroyed her tribe to prevent an eternal winter from erasing the last of her people.",
    description: "WOLVES OF THE FIRST SNOW is an epic fantasy deeply rooted in Siberian folklore. Yara was cast out after a ritual gone wrong killed three elders. Now the same ancient spirit is back — and the only way to stop it is through a binding, not a battle. Yara must become what she was exiled for.",
    synopsis: "She was called a monster. The world will need her to be one.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Fantasy",
    subGenres: ["Adventure", "Mythology"],
    budget: "high",
    rating: 4.7,
    reviewCount: 44,
    readsCount: 601,
    isFeatured: true,
    premium: false,
    tags: ["fantasy", "shamanism", "Siberia", "mythology", "survival"],
    classification: {
      primaryGenre: "Fantasy",
      secondaryGenre: "Adventure",
      tones: ["epic", "mythic", "emotional"],
      themes: ["redemption", "nature spirits", "belonging"],
      settings: ["Siberian steppe", "spirit world", "ancient forests"],
    },
  },
  {
    title: "Frame 48",
    genre: "Mystery",
    logline: "A forensic film archivist restoring a lost 1960s noir discovers a real, unsolved murder hidden inside a single frame of the negative.",
    description: "FRAME 48 is a slow-burn mystery that weaves the past and present together through celluloid and secrets. Declan Furst spends his days reassembling forgotten films. When he holds a recovered nitrate reel up to the light, he sees something no cinematographer intended — a face, a body, a truth buried for sixty years.",
    synopsis: "Someone put a confession in the dark. Declan just found it.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Mystery",
    subGenres: ["Thriller", "Historical"],
    budget: "low",
    rating: 4.6,
    reviewCount: 18,
    readsCount: 264,
    isFeatured: false,
    premium: false,
    tags: ["mystery", "film noir", "archives", "cold case", "period"],
    classification: {
      primaryGenre: "Mystery",
      secondaryGenre: "Historical",
      tones: ["moody", "cerebral", "gripping"],
      themes: ["truth", "obsession", "forgotten lives"],
      settings: ["film archive", "1960s flashbacks", "New York"],
    },
  },
  {
    title: "Parallel 28",
    genre: "Thriller",
    logline: "Two identical women — one a surgeon, one a hitman — discover they've been tracked, swapped, and used as pawns in the same operation.",
    description: "PARALLEL 28 is a propulsive twin-identity thriller. Dr. Leila Nazari has no idea she has a double. Neither does the operative known only as Atlas. When they both walk into the same hotel lobby on the same night in Istanbul, a deep-state program built on their likenesses begins to unravel — and someone starts killing both of them.",
    synopsis: "They've never met. They share a face, a file, and now a target.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Thriller",
    subGenres: ["Action", "Mystery"],
    budget: "high",
    rating: 4.4,
    reviewCount: 31,
    readsCount: 412,
    isFeatured: false,
    premium: true,
    price: 59,
    tags: ["twin", "spy", "Istanbul", "identity", "action-thriller"],
    classification: {
      primaryGenre: "Thriller",
      secondaryGenre: "Action",
      tones: ["kinetic", "paranoid", "stylish"],
      themes: ["identity", "duality", "state surveillance"],
      settings: ["Istanbul", "European cities", "government black sites"],
    },
  },
  {
    title: "Half-Light",
    genre: "Romance",
    logline: "A lighthouse keeper on a remote Scottish island and a marine photographer stranded by a storm have seven days to decide if what they feel is real — or just the isolation talking.",
    description: "HALF-LIGHT is a slow romantic drama about two people who've both given up on closeness. Finn maintains the Ardmore lighthouse alone by choice. Elara arrived to photograph storm swells and lost her boat. The weather gives them one week. The rest is up to them.",
    synopsis: "Some places make you honest. Some people make you brave. Occasionally you find both at the same time.",
    contentType: "movie",
    format: "feature_film",
    primaryGenre: "Romance",
    subGenres: ["Drama"],
    budget: "low",
    rating: 4.8,
    reviewCount: 63,
    readsCount: 792,
    isFeatured: true,
    premium: false,
    tags: ["romance", "Scotland", "lighthouse", "slow burn", "emotional"],
    classification: {
      primaryGenre: "Romance",
      secondaryGenre: "Drama",
      tones: ["tender", "atmospheric", "bittersweet"],
      themes: ["solitude", "connection", "second chances"],
      settings: ["Scottish island", "lighthouse", "winter storms"],
    },
  },
];

const WRITERS = [
  { name: "Arjun Mehta", email: "arjun.mehta@demo.com", role: "writer", bio: "Arjun writes grounded human dramas rooted in South Asian identity, diaspora, and the weight of expectation. Based in Mumbai.", skills: ["drama", "family", "social realism"] },
  { name: "Sofia Reinholt", email: "sofia.reinholt@demo.com", role: "writer", bio: "Sofia is a Danish screenwriter specialising in psychological thrillers and noir. Alumnus of the National Film School of Denmark.", skills: ["thriller", "noir", "psychological"] },
  { name: "Marcus Webb", email: "marcus.webb@demo.com", role: "writer", bio: "Marcus spent a decade writing for network television before pivoting to feature films. Known for sharp ensemble comedies and heist scripts.", skills: ["comedy", "heist", "ensemble"] },
  { name: "Yuki Tanaka", email: "yuki.tanaka@demo.com", role: "writer", bio: "Yuki blends Japanese folklore with contemporary sci-fi. Her scripts have been optioned by two streaming platforms and one feature studio.", skills: ["sci-fi", "fantasy", "mythology"] },
  { name: "Priya Nair", email: "priya.nair@demo.com", role: "writer", bio: "Priya writes across genres but is best known for political thrillers and stories about women navigating systems built to exclude them.", skills: ["thriller", "drama", "political"] },
  { name: "Callum Fraser", email: "callum.fraser@demo.com", role: "writer", bio: "A Scottish writer who draws on landscape and silence. His work sits between literary drama and genre — quiet films that hit hard.", skills: ["drama", "romance", "literary"] },
];

async function seed() {
  await connectDB();

  console.log("🌱 Starting script seed...\n");

  // Upsert demo writer accounts
  const writerDocs = [];
  for (const w of WRITERS) {
    let user = await User.findOne({ email: w.email });
    if (!user) {
      user = await User.create({
        name: w.name,
        email: w.email,
        password: "Demo1234!", // plain — will be hashed if your pre-save hook exists, else stored as-is for demo
        role: w.role,
        bio: w.bio,
        skills: w.skills,
        isVerified: true,
      });
      console.log(`  ✅ Created writer: ${w.name}`);
    } else {
      console.log(`  ↩️  Writer exists: ${w.name}`);
    }
    writerDocs.push(user);
  }

  // Assign each script to a writer (round-robin) and insert if not duplicate title
  let created = 0;
  let skipped = 0;
  for (let i = 0; i < SCRIPTS.length; i++) {
    const data = SCRIPTS[i];
    const existing = await Script.findOne({ title: data.title });
    if (existing) {
      console.log(`  ↩️  Skipped (exists): ${data.title}`);
      skipped++;
      continue;
    }
    const creator = writerDocs[i % writerDocs.length];
    await Script.create({ ...data, creator: creator._id, status: "published" });
    console.log(`  📝 Created: "${data.title}" — ${data.genre} — by ${creator.name}`);
    created++;
  }

  console.log(`\n✨ Done. Created ${created} scripts, skipped ${skipped} duplicates.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
