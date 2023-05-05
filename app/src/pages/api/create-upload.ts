import dbConnect from "@/lib/connect-db";
import { Token } from "@/models/Token";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextApiRequest, NextApiResponse } from "next";
import { bucketClient } from "@/utils/storage";

const BUCKET_NAME = process.env.GCP_RAW_BUCKET!;

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
        const key = req.body.key;
        const command = new CreateMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const { UploadId, Key } = await bucketClient.send(command);

        res.json({ UploadId, Key });
    } else {
        res.status(404).json({
            msg: "This method doesn't exist on this route",
        });
    }
}
