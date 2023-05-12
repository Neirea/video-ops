import { model, models, Schema, Types } from "mongoose";

type VideoSchemaType = {
    name: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
};

export type VideoFullType = VideoSchemaType & { _id: Types.ObjectId };

export type VideoType = Pick<VideoFullType,"name" | "url">;

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
