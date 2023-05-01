import CustomError from "@/utils/CustomError";
import { NextApiRequest, NextApiResponse } from "next";
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Token } from "@/models/Token";

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
        const promises = [];

        for (let index = 0; index < parts; index++) {
            const command = new UploadPartCommand({
                Bucket: BUCKET_NAME,
                Key,
                UploadId,
                PartNumber: index + 1,
            });
            promises.push(getSignedUrl(bucketClient, command));
        }

        const signedUrls = await Promise.all(promises);
        const partSignedUrlList = signedUrls.map((signedUrl, index) => {
            return {
                signedUrl: signedUrl,
                PartNumber: index + 1,
            };
        });

        res.json({
            parts: partSignedUrlList,
        });
    } else {
        res.status(404).json({
            msg: "This method doesn't exist on this route",
        });
    }
}
