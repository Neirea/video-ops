import { model, Schema } from "mongoose";

const VideoSchema = new Schema({
    name: String,
});

export default model("Video", VideoSchema);
