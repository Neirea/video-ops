import mongoose from "mongoose";

async function dbConnect() {
    mongoose.set("strictQuery", false);
    mongoose.connect(process.env.MONGO_URL!);
}

export default dbConnect;
