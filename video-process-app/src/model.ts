import { model, Schema } from "mongoose";

const VideoSchema = new Schema({
    name: String,
    low: String,
    normal: String,
    high: String,
});

export default model("Video", VideoSchema);
