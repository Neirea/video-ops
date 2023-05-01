import { Token } from "@/models/Token";
import CustomError from "@/utils/CustomError";
import { CreateMultipartUploadCommand, S3Client } from "@aws-sdk/client-s3";
import { NextApiRequest, NextApiResponse } from "next";

const BUCKET_NAME = process.env.GCP_RAW_BUCKET!;
//api for multipart upload
const bucketClient = new S3Client({
    endpoint: "https://storage.googleapis.com",
    credentials: {
        accessKeyId: process.env.GCP_ACCESS_KEY!,
        secretAccessKey: process.env.GCP_SECRET_ACCESS_KEY!,
    },
    region: process.env.GCP_BUCKET_REGION!,
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === "POST") {
        console.log("starting create-upload");

        const token = req.headers["token"] as string;
        try {
            const tokens = await Token.find({ charges: { $gte: 1 } });
            if (!tokens.map((i) => i.token).includes(token)) {
                throw new CustomError("Access Denied", 403);
            }
        } catch (error) {
            console.log(error);
        }

        console.log("received tokens");

        const name = req.body.name;
        const command = new CreateMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: name,
        });

        const { UploadId, Key } = await bucketClient.send(command);
        console.log("finished");

        res.json({ UploadId, Key });
    } else {
        res.status(404).json({
            msg: "This method doesn't exist on this route",
        });
    }
}
