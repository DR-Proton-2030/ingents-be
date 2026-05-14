import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents";

async function cleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not found");

    // 1. Delete all subscriptions (will be auto-created fresh per company)
    const subResult = await db.collection("subscriptions").deleteMany({});
    console.log(`Deleted ${subResult.deletedCount} subscriptions`);

    // 2. Drop old indexes on subscriptions collection to avoid conflicts
    try {
      await db.collection("subscriptions").dropIndexes();
      console.log("Dropped old subscription indexes");
    } catch (e) {
      console.log("No indexes to drop (collection may not exist yet)");
    }

    // 3. Delete all payments for clean slate
    const payResult = await db.collection("payments").deleteMany({});
    console.log(`Deleted ${payResult.deletedCount} payments`);

    console.log("\nCleanup complete! The unique company_id index will be created on next server start.");
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

cleanup();
