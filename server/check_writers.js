import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const activeWriters = await db.collection('users').countDocuments({ role: 'writer', isDeactivated: { $ne: true } });
    const deactivatedWriters = await db.collection('users').countDocuments({ role: 'writer', isDeactivated: true });
    console.log('ACTIVE WRITERS:', activeWriters);
    console.log('DEACTIVATED WRITERS:', deactivatedWriters);
    
    const activeCreators = await db.collection('users').countDocuments({ role: 'creator', isDeactivated: { $ne: true } });
    const deactivatedCreators = await db.collection('users').countDocuments({ role: 'creator', isDeactivated: true });
    console.log('ACTIVE CREATORS:', activeCreators);
    console.log('DEACTIVATED CREATORS:', deactivatedCreators);
    
    process.exit(0);
}).catch(console.error);
