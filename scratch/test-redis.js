const Redis = require('ioredis');

const REDIS_CONFIG = {
  host: '34.193.197.104',
  port: 6379,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
  lazyConnect: true,
  enableOfflineQueue: false,
};

async function test() {
  const redis = new Redis(REDIS_CONFIG);
  console.log('Connecting to Redis at 34.239.191.112:6379...');
  try {
    await redis.connect();
    console.log('Connected successfully!');
    await redis.ping();
    console.log('Ping successful!');
    await redis.quit();
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    process.exit();
  }
}

test();
