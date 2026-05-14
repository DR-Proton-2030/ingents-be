import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents";

async function checkUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not found");

    const users = await db.collection("users").find({}).toArray();
    console.log("Users:");
    users.forEach(u => console.log(`- ${u.full_name} (${u.email}): Company ID = ${u.company_object_id}`));

    const subscriptions = await db.collection("subscriptions").find({}).toArray();
    console.log("\nSubscriptions:");
    subscriptions.forEach(s => console.log(`- ${s.plan} (Status: ${s.status}): Company ID = ${s.company_id}, User ID = ${s.user_id}`));

    process.exit(0);
  } catch (error) {
    console.error("Check failed:", error);
    process.exit(1);
  }
}

checkUsers();
