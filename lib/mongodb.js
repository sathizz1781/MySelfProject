import mongoose from "mongoose";

// ─── MongoDB URI comes from your .env.local (dev) or .env.production (live) ───
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "WARNING: MONGODB_URI is not defined.\n" +
      "Set it in .env.local (for local dev) or .env.production (for live).\n" +
      "See .env.example for the template.",
  );
}

/**
 * Global cache prevents creating multiple connections during hot-reload in dev.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default connectDB;
