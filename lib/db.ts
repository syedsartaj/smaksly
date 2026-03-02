import mongoose from 'mongoose';

let cached = (global as any).mongooseDb || { conn: null, promise: null };
(global as any).mongooseDb = cached;

export const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};
