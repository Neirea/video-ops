import { model, models, Schema, Types } from "mongoose";

export type VideoSchemaType = {
    name: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
};

export type VideoType = VideoSchemaType & { _id: Types.ObjectId };

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
    { timestamps: true }
);

const Video = models.Video || model<VideoSchemaType>("Video", VideoSchema);

export { Video };
