import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGO_URL;

if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGO_URL environment variable inside .env.local",
    );
}

const globalForMongoose = global as unknown as {
    mongoose: { promise: Promise<Mongoose> | null; conn: Mongoose | null };
};
/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */

let cached = globalForMongoose.mongoose;

if (!cached) {
    cached = globalForMongoose.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };
        cached.promise = mongoose
            .connect(MONGODB_URI!, opts)
            .then((mongoose) => {
                return mongoose;
            });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}

export default dbConnect;
