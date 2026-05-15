/**
 * Quick script to check if a user exists in the database.
 * Run with: node scratch/check-user.js
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { MongoClient } = require("mongodb");

// Try both connection strings — SRV first, direct shard fallback
const SRV_URI =
  "mongodb+srv://drprotonofficial:Adarsha%40123@cluster0.9ogg6pi.mongodb.net/ingents?retryWrites=true&w=majority";

const DIRECT_URI =
  "mongodb://drprotonofficial:Adarsha%40123@ac-mvd5iid-shard-00-00.9ogg6pi.mongodb.net:27017/ingents?ssl=true&authSource=admin&directConnection=true";

const EMAIL_TO_CHECK = "vijay.kumar@scripturesresearch.com";

async function checkUser(uri, label) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  });

  try {
    console.log(`\n🔌 Connecting via ${label}...`);
    await client.connect();
    console.log(`✅ Connected to: ${client.options?.hosts?.[0] || uri.split("@")[1]?.split("/")[0]}`);

    const db = client.db("ingents");

    // 1. Count total users
    const totalUsers = await db.collection("users").countDocuments();
    console.log(`📊 Total users in DB: ${totalUsers}`);

    // 2. Exact match
    const exactMatch = await db
      .collection("users")
      .findOne({ email: EMAIL_TO_CHECK });

    if (exactMatch) {
      console.log(`\n✅ EXACT MATCH FOUND:`);
      console.log(`   _id:       ${exactMatch._id}`);
      console.log(`   email:     ${exactMatch.email}`);
      console.log(`   full_name: ${exactMatch.full_name}`);
      console.log(`   role:      ${exactMatch.role}`);
    } else {
      console.log(`\n❌ No exact match for: "${EMAIL_TO_CHECK}"`);

      // 3. Case-insensitive search
      const caseInsensitive = await db
        .collection("users")
        .findOne({ email: { $regex: new RegExp(`^${EMAIL_TO_CHECK}$`, "i") } });

      if (caseInsensitive) {
        console.log(`\n⚠️  CASE-INSENSITIVE MATCH FOUND (email stored differently):`);
        console.log(`   Stored email: "${caseInsensitive.email}"`);
        console.log(`   _id:          ${caseInsensitive._id}`);
      } else {
        console.log(`   Case-insensitive search also found nothing.`);
      }

      // 4. Show first 5 emails in DB so you can compare
      const sample = await db
        .collection("users")
        .find({}, { projection: { email: 1, full_name: 1 } })
        .limit(5)
        .toArray();

      console.log(`\n📋 Sample emails in DB (first 5):`);
      sample.forEach((u) => console.log(`   "${u.email}" — ${u.full_name}`));
    }

    await client.close();
    return true;
  } catch (err) {
    console.error(`❌ ${label} failed: ${err.message}`);
    await client.close().catch(() => {});
    return false;
  }
}

async function main() {
  console.log(`\n🔍 Checking for user: ${EMAIL_TO_CHECK}`);
  console.log("=".repeat(60));

  // Try SRV first (correct for production)
  const srvOk = await checkUser(SRV_URI, "SRV (mongodb+srv://)");

  if (!srvOk) {
    // Fallback to direct shard
    await checkUser(DIRECT_URI, "Direct shard connection");
  }

  process.exit(0);
}

main();
