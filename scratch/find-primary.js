/**
 * Finds which Atlas shard node is the primary.
 * Run: node scratch/find-primary.js
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { MongoClient } = require("mongodb");

const CREDS = "drprotonofficial:Adarsha%40123";
const HOSTS = [
  "ac-mvd5iid-shard-00-00.9ogg6pi.mongodb.net:27017",
  "ac-mvd5iid-shard-00-01.9ogg6pi.mongodb.net:27017",
  "ac-mvd5iid-shard-00-02.9ogg6pi.mongodb.net:27017",
];

async function main() {
  console.log("Checking which Atlas shard node is PRIMARY...\n");

  for (const host of HOSTS) {
    const uri = `mongodb://${CREDS}@${host}/ingents?ssl=true&authSource=admin&directConnection=true`;
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });

    try {
      await client.connect();
      const status = await client.db("admin").command({ isMaster: 1 });
      const role = status.ismaster ? "✅ PRIMARY" : status.secondary ? "🔸 SECONDARY" : "❓ UNKNOWN";
      console.log(`${role}  →  ${host}`);
      await client.close();
    } catch (e) {
      console.log(`❌ UNREACHABLE  →  ${host}  (${e.message.split("\n")[0]})`);
    }
  }
}

main().then(() => process.exit(0));
