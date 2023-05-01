import { Token } from "@/models/Token";
import CustomError from "@/utils/CustomError";
import { CompleteMultipartUploadCommand, S3Client } from "@aws-sdk/client-s3";
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
        // const token = req.headers["token"] as string;
        // const tokens = await Token.find({ charges: { $gte: 1 } });
        // if (!tokens.map((i) => i.token).includes(token)) {
        //     throw new CustomError("Access Denied", 403);
        // }
        const { Key, UploadId, parts } = req.body;

        const command = new CompleteMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key,
            UploadId,
            MultipartUpload: {
                Parts: parts,
            },
        });
        await bucketClient.send(command);

        //decrement until 0
        // await Token.updateOne(
        //     { token: token, charges: { $gte: 1 } },
        //     { $inc: { charges: -1 } }
        // );
        res.json({ success: true });
    } else {
        res.status(404).json({
            msg: "This method doesn't exist on this route",
        });
    }
}
