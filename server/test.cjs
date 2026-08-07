const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scriptbridge').then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ 
        $or: [
            { 'writerProfile.membershipVerification.swa.status': 'approved' },
            { 'writerProfile.membershipVerification.wga.status': 'approved' },
            { 'writerProfile.wgaMember': true },
            { 'writerProfile.sgaMember': true }
        ] 
    }).toArray();
    console.log('Found:', users.length);
    if(users.length > 0) {
        console.log(JSON.stringify(users.map(u => ({ email: u.email, role: u.role, writerProfile: u.writerProfile })), null, 2));
    }
    mongoose.disconnect();
}).catch(console.error);
