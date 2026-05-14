import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents";

async function checkTypes() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not found");

    const subscriptions = await db.collection("subscriptions").find({}).toArray();
    console.log("Subscriptions Types:");
    subscriptions.forEach(s => {
      console.log(`- Plan: ${s.plan}, Company ID Type: ${typeof s.company_id}, Value: ${s.company_id}, IsObjectId: ${s.company_id instanceof mongoose.Types.ObjectId}`);
    });

    const users = await db.collection("users").find({}).toArray();
    console.log("\nUsers Types:");
    users.forEach(u => {
      console.log(`- User: ${u.full_name}, Company ID Type: ${typeof u.company_object_id}, Value: ${u.company_object_id}, IsObjectId: ${u.company_object_id instanceof mongoose.Types.ObjectId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Check failed:", error);
    process.exit(1);
  }
}

checkTypes();
