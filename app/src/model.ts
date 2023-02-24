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
const TokenSchema = new Schema({
    token: {
        type: String,
        unique: true,
        required: true,
    },
    charges: {
        type: Number,
        min: 0,
        required: true,
    },
});

const Video = model("Video", VideoSchema);
const Token = model("Key", TokenSchema);

export { Video, Token };
