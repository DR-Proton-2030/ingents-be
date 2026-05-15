import mongoose from "mongoose";

const USE_LOCAL = process.env.USE_LOCAL_MONGO === "true";

// Used on Railway — set MONGO_URI env var in Railway dashboard
const ATLAS_SRV_URI =
  "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents?retryWrites=true&w=majority";

// Local dev fallback — directConnection bypasses SRV DNS (blocked by some ISPs/firewalls).
// Points to shard-00-01 which is the current PRIMARY node (run scratch/find-primary.js to recheck).
const ATLAS_DIRECT_URI =
  "mongodb://drprotonofficial:Adarsha%40123@ac-mvd5iid-shard-00-01.9ogg6pi.mongodb.net:27017/ingents?ssl=true&authSource=admin&directConnection=true";

const LOCAL_URI = "mongodb://localhost:27017/ingents";

// Priority: USE_LOCAL → MONGO_URI env var (Railway) → direct URI (local dev)
const MONGO_URI = USE_LOCAL
  ? LOCAL_URI
  : process.env.MONGO_URI
  ? ATLAS_SRV_URI
  : ATLAS_DIRECT_URI;

const connectDb = async () => {
  try {
    const label = USE_LOCAL
      ? "LOCAL"
      : process.env.MONGO_URI
      ? "ATLAS SRV (Railway)"
      : "ATLAS direct (local dev)";
    console.log(`Connecting to MongoDB (${label})...`);
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 20000,
    });
    console.log(
      `\x1b[34m \x1b[1m \x1b[4mMongoDB Connected: ${conn.connection.host}\x1b[0m`
    );
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
};

export default connectDb;
