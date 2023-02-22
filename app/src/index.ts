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
import path from "path";
import errorHandlerMiddleware from "./middleware/error-handle";
import notFound from "./middleware/not-found";
import { Storage } from "@google-cloud/storage";
import mongoose from "mongoose";
import Video from "./model";

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

const storage = new Storage({
    projectId: process.env.GOOGLE_STORAGE_PROJECT_ID,
    credentials: {
        type: "service_account",
        private_key: process.env
            .GOOGLE_STORAGE_PRIVATE_KEY!.split(String.raw`\n`)
            .join("\n"),
        client_email: process.env.GOOGLE_STORAGE_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        token_url: "https://oauth2.googleapis.com/token",
    },
});

const app = express();
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL!);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                "connect-src": [
                    process.env.RAILWAY_STATIC_URL || "http://localhost:5000",
                    `https://${process.env.GCP_RAW_BUCKET}.storage.googleapis.com`,
                ],
            },
        },
    })
);
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "public")));

app.use("/videos/:id", (req, res) => {
    res.send();
});

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1hour
    max: 3, // Limit each IP to 3 requests per `window` (here, per hour)
    message: { message: "Too many requests. Try again later" },
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

app.post("/get-upload-urls", async (req, res) => {
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

    const command = new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key,
        UploadId,
        MultipartUpload: {
            Parts: parts,
        },
    });
    await bucketClient.send(command);
    res.json({ success: true });
});

app.get("/video", async (req, res) => {
    const queryVideo = req.query.v as string;
    const queryQuality = req.query.q as string;
    const videoName = queryVideo
        ? queryQuality
            ? `${queryVideo}_${queryQuality}.mp4`
            : `${queryVideo}_1080.mp4`
        : "test.mp4";
    // Ensure there is a range given for the video
    const range = req.headers.range!;
    if (!range) {
        res.status(400).send("Requires Range header");
    }
    const file = storage.bucket(process.env.GCP_PROD_BUCKET!).file(videoName);
    const metadata = await file.getMetadata();
    if (!metadata) throw new CustomError("Content Not Found", 404);
    const videoSize = metadata[0].size;

    // Parse Range
    // Example: "bytes=32324-"
    const CHUNK_SIZE = 3 * 10 ** 6; // 3MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // Create headers
    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = file.createReadStream({ start, end });

    // Stream the video chunk to the client
    videoStream.pipe(res);
});

app.get("/videos", async (req, res) => {
    const videoNames = await Video.find({}).select({ name: 1, _id: 0 });
    res.json({ videoNames });
});

app.use(notFound);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}...`);
});
