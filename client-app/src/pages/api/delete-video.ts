import dbConnect from "@/lib/db";
import { Token } from "@/models/Token";
import { Video } from "@/models/Video";
import { storage } from "@/utils/storage";
import type { NextApiRequest, NextApiResponse } from "next";

type TypedNextApiRequest<T> = Omit<NextApiRequest, "body"> & {
    body: T;
};

export default async function handler(
    req: TypedNextApiRequest<{ url: string }>,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.status(404).json({
            msg: "This method doesn't exist on this route",
        });
        return;
    }
    await dbConnect();
    const token = req.headers["token"] as string;
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
        res.status(403).json({ message: "Access Denied" });
        return;
    }
    try {
        const video = await Video.findOne({ url: req.body.url });
        if (!video) {
            res.status(400).send({ message: "Failed to delete video" });
            return;
        }
        await storage
            .bucket(process.env.GCP_PROD_BUCKET!)
            .deleteFiles({ prefix: video.url });

        await Video.deleteOne({ url: video.url });

        res.status(200).end();
    } catch (error) {
        console.log(error);
        res.status(400).send({ message: "Failed to delete video" });
    }
}
