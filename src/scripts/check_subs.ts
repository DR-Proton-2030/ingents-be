import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents";

async function checkSubscriptions() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not found");

    const subscriptions = await db.collection("subscriptions").find({}).toArray();
    console.log("Subscriptions Details:");
    subscriptions.forEach(s => {
      console.log(`- Plan: ${s.plan}, Status: ${s.status}, Amount: ${s.amount}, Company: ${s.company_id}, Created: ${s.createdAt}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Check failed:", error);
    process.exit(1);
  }
}

checkSubscriptions();
