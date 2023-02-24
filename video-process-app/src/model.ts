import { model, Schema } from "mongoose";

const VideoSchema = new Schema(
    {
        name: {
            type: String,
            unique: true,
            required: true,
        },
        url: String,
    },
    { timestamps: true }
);

export default model("Video", VideoSchema);
