import dbConnect from "@/lib/connect-db";
import { Token } from "@/models/Token";
import { Video } from "@/models/Video";
import { NextApiRequest, NextApiResponse } from "next";
import { storage } from "@/utils/storage";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === "POST") {
        await dbConnect();
        const token = req.headers["token"] as string;
        const tokens = await Token.find({ charges: { $gte: 1 } });
        if (!tokens.map((i) => i.token).includes(token)) {
            res.status(403).json({ message: "Acess Denied" });
            return;
        }
        const url = req.body.url;
        try {
            const video = await Video.findOne({ url });

            await storage
                .bucket(process.env.GCP_PROD_BUCKET!)
                .deleteFiles({ prefix: video.url });

            await Video.deleteOne({ url });

            res.status(200).end();
        } catch (error) {
            console.log(error);

            res.status(400).send({ message: "Failed to delete video" });
        }
    }
}
