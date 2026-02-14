
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function checkUsers() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not found');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const usersCount = await db.collection('users').countDocuments();
    console.log('Total users:', usersCount);

    if (usersCount > 0) {
      const users = await db.collection('users').find({}).limit(5).toArray();
      console.log('First 5 users:', users.map(u => ({ id: u._id, email: u.email })));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUsers();
