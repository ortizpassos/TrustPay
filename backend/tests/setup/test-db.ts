import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import path from 'path';

// Increase default Jest timeout to allow MongoDB binary download/startup
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.jest?.setTimeout?.(120000);

let mongo: MongoMemoryServer;

beforeAll(async () => {
  // Use a project-local download dir to avoid Windows lockfile conflicts in user cache
  const downloadDir = path.join(require('os').tmpdir(), 'mongodb-binaries-tests');
  process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || downloadDir;
  // Pin a stable MongoDB version for tests (adjust if needed)
  process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.14';

  mongo = await MongoMemoryServer.create({
    binary: {
      version: process.env.MONGOMS_VERSION,
      downloadDir: process.env.MONGOMS_DOWNLOAD_DIR
    }
  });
  const uri = mongo.getUri();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_1234567890';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_123456';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
  // Best-effort cleanup of temp download dir (ignore errors)
  try {
    const fs = await import('fs/promises');
    await fs.rm(process.env.MONGOMS_DOWNLOAD_DIR as string, { recursive: true, force: true });
  } catch {}
});

afterEach(async () => {
  const db = mongoose.connection.db;
  if (!db) {
    return;
  }
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
