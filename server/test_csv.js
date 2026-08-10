async function test() {
    const mongoose = require('mongoose');
    require('dotenv').config({path: 'server/.env'});
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const admin = await db.collection('users').findOne({role: 'admin'});
    
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(16).toString('hex');
    await db.collection('users').updateOne(
        { _id: admin._id },
        { $push: { activeSessions: { sessionId, lastSeen: new Date() } } }
    );
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: admin._id, role: 'admin', sessionId }, process.env.JWT_SECRET);
    
    try {
        let res = await fetch('http://localhost:5002/api/admin/users?role=creator&limit=0', {
            headers: { Authorization: `Bearer ${token}` }
        });
        let data = await res.json();
        console.log("CREATORS RETURNED:", data.users?.length);
        
        let res2 = await fetch('http://localhost:5002/api/admin/users?role=writer&limit=0', {
            headers: { Authorization: `Bearer ${token}` }
        });
        let data2 = await res2.json();
        console.log("WRITERS RETURNED:", data2.users?.length);
    } catch (e) {
        console.log(e.message);
    }
    process.exit(0);
}
test();
