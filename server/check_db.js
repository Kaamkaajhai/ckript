import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ role: { $in: ['writer', 'creator'] } }).toArray();
    console.log('WRITERS IN DB:', users.length);
    process.exit(0);
}).catch(console.error);
