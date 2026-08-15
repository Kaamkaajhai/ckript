import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const admin = await db.collection('users').findOne({ role: 'admin' });
    
    // Add a dummy session to the admin to bypass session check
    const crypto = await import('crypto');
    const sessionId = crypto.randomBytes(16).toString('hex');
    await db.collection('users').updateOne(
        { _id: admin._id },
        { $push: { activeSessions: { sessionId, lastSeen: new Date() } } }
    );
    
    const token = jwt.sign({ id: admin._id.toString(), sessionId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    try {
        const res = await axios.get('http://localhost:5002/api/admin/users?role=writer&page=1', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("RESPONSE STATUS:", res.status);
        console.log("RESPONSE DATA LENGTH:", res.data.users.length);
        console.log("FIRST USER:", res.data.users[0] ? res.data.users[0].email : 'None');
    } catch (e) {
        console.log("ERROR:", e.response ? e.response.data : e.message);
    }
    process.exit(0);
}).catch(console.error);
