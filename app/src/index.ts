import {
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    S3Client,
    UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "dotenv/config";
import express from "express";
import "express-async-errors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { orderBy } from "lodash";
import path from "path";
import errorHandlerMiddleware from "./middleware/error-handle";
import notFound from "./middleware/not-found";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME!;

const bucketClient = new S3Client({
    endpoint: "https://storage.googleapis.com",
    credentials: {
        accessKeyId: process.env.GCP_ACCESS_KEY!,
        secretAccessKey: process.env.GCP_SECRET_ACCESS_KEY!,
    },
    region: process.env.GCP_BUCKET_REGION!,
});

const app = express();

app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);

app.use(express.json());
app.use("/", express.static(path.join(__dirname, "public")));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1hour
    max: 3, // Limit each IP to 3 requests per `window` (here, per hour)
    message:
        "Too many attemps made from this IP, please try again after an hour",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

class CustomError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

app.post("/create-upload", limiter, async (req, res) => {
    const token = req.headers["token"];
    if (token !== process.env.TOKEN) {
        throw new CustomError("Access Denied", 403);
    }
    const name = req.body.name;
    const command = new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: name,
    });

    const { UploadId, Key } = await bucketClient.send(command);

    res.json({ UploadId, Key });
});

app.post("/get-upload-urls", limiter, async (req, res) => {
    const token = req.headers["token"];
    if (token !== process.env.TOKEN) {
        throw new CustomError("Access Denied", 403);
    }
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
});

app.post("/complete-upload", limiter, async (req, res) => {
    const token = req.headers["token"];
    if (token !== process.env.TOKEN) {
        throw new CustomError("Access Denied", 403);
    }
    const { Key, UploadId, parts } = req.body;

    // ordering the parts to make sure they are in the right order
    const Parts = orderBy(parts, ["PartNumber"], ["asc"]);

    const command = new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key,
        UploadId,
        MultipartUpload: {
            Parts,
        },
    });
    await bucketClient.send(command);
    res.json({ success: true });
});

app.use(notFound);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}...`);
});
