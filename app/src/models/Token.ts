import { model, models, Schema } from "mongoose";

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

const Token = models.Key || model("Key", TokenSchema);

export { Token };
