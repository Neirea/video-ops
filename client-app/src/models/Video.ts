import { Model, model, models, Schema, Types } from "mongoose";

type VideoSchemaType = {
    name: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
};

export interface VideoFullType extends VideoSchemaType {
    _id: Types.ObjectId;
}

export type VideoType = Pick<VideoFullType, "name" | "url">;

const VideoSchema = new Schema(
    {
        name: {
            type: String,
            unique: true,
            required: true,
        },
        url: {
            type: String,
            unique: true,
            required: true,
        },
    },
    { timestamps: true },
);

const Video: Model<VideoSchemaType> =
    models.Video || model("Video", VideoSchema);

export { Video };
