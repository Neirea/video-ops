import { Model, model, models, Schema } from "mongoose";

export type TokenType = { token: string; charges: number };

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

const Token = (models.Token as Model<TokenType>) || model("Token", TokenSchema);

export { Token };
