import "dotenv/config";
import express from "express";
import path from "path";
import helmet from "helmet";
import {
    S3Client,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { orderBy } from "lodash";

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

const inputBucket = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_BUCKET_REGION!,
});

const app = express();

(async () => {
    app.use(
        helmet({
            contentSecurityPolicy: false,
        })
    );
    // app.use(cors());
    app.use(express.json());
    app.use("/", express.static(path.join(__dirname, "public")));

    const port = process.env.PORT || 5000;

    app.post("/create-upload", async (req, res) => {
        console.log(req.body);

        const name = req.body.name;
        const command = new CreateMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: name,
        });

        const { UploadId, Key } = await inputBucket.send(command);

        res.json({ UploadId, Key });
    });

    app.post("/get-upload-urls", async (req, res) => {
        const { Key, UploadId, parts } = req.body;
        const promises = [];

        for (let index = 0; index < parts; index++) {
            const command = new UploadPartCommand({
                Bucket: BUCKET_NAME,
                Key,
                UploadId,
                PartNumber: index + 1,
            });

            promises.push(getSignedUrl(inputBucket, command));
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
    });

    app.post("/complete-upload", async (req, res) => {
        const { Key, UploadId, parts } = req.body;

        const command = new CompleteMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key,
            UploadId,
            MultipartUpload: {
                // ordering the parts to make sure they are in the right order
                Parts: orderBy(parts, ["PartNumber"], ["asc"]),
            },
        });
        const result = await inputBucket.send(command);
        console.log(result);
        res.json({ success: true });
    });

    app.listen(port, () => {
        console.log(`Server is running on port ${port}...`);
    });
})();
