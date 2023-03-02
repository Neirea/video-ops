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
import { Video, Token } from "./model";
import { readFile } from "fs/promises";

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

const serverUrl = process.env.RAILWAY_STATIC_URL || "http://localhost:5000";

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                "connect-src": [
                    serverUrl,
                    process.env.WS_URL || "ws://localhost:8080",
                    `https://${process.env.GCP_RAW_BUCKET}.storage.googleapis.com`,
                ],
                "img-src": ["self", serverUrl, "blob:"],
            },
        },
    })
);
app.use(express.json());
app.use("/", express.static(path.join(__dirname, "public")));

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
    const token = req.headers["token"] as string;
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
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
    const token = req.headers["token"] as string;
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
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
    const token = req.headers["token"] as string;
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
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

    //decrement until 0
    await Token.updateOne(
        { token: token, charges: { $gte: 1 } },
        { $inc: { charges: -1 } }
    );
    res.json({ success: true });
});

app.get("/video", async (req, res) => {
    const queryVideo = req.query.v as string;
    const queryQuality = req.query.q as string;
    const videoName = queryQuality
        ? `${queryVideo}_${queryQuality}.mp4`
        : `${queryVideo}_1080.mp4`;
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
    // Example: "bytes=0-1" or "bytes=0-"
    const CHUNK_SIZE = 3 * 10 ** 6; // 3MB if end is not specified
    const parts = range.replace("bytes=", "").split("-");
    const start = parseInt(parts[0]);
    const end =
        parseInt(parts[1]) || Math.min(start + CHUNK_SIZE, videoSize - 1);

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

// CSP for embeded route
const embedHelmet = helmet.contentSecurityPolicy({
    directives: {
        "img-src": ["self", "blob:"],
        "frame-ancestors": "*",
    },
});

app.get("/static/embed/css", async function (req, res) {
    var css = await readFile(__dirname + "/embed/style.css", "utf8");
    res.setHeader("Content-Type", "text/css");
    res.send(css);
});

app.get("/static/embed/js", async function (req, res) {
    var js = await readFile(__dirname + "/embed/main.js", "utf8");
    res.setHeader("Content-Type", "application/javascript");
    res.send(js);
});

app.get("/embed/:id", embedHelmet, async (req, res) => {
    const headers = req.headers;
    const isIframe =
        headers["x-requested-with"] === "XMLHttpRequest" ||
        headers["sec-fetch-dest"] === "iframe";
    if (!isIframe) {
        res.status(404).send("Sorry can only use this route as iframe src");
        return;
    }
    const video = await Video.findOne({ url: req.params.id });
    const videoTitle = video ? video.name : "Unknown Title";

    const html1 = await readFile(__dirname + "/embed/index.html", "utf-8");
    const html2 = html1.replace(/%ID%/g, req.params.id);
    const html3 = html2.replace(/%SERVER_URL%/g, serverUrl);
    const resHtml = html3.replace(/%NAME%/g, videoTitle);
    res.set("Origin-Agent-Cluster", "site");
    res.send(resHtml);
});

app.get("/image", async (req, res) => {
    const imgName = req.query.img as string;
    const file = storage
        .bucket(process.env.GCP_PROD_BUCKET!)
        .file(imgName + ".webp");
    const metadata = await file.getMetadata();
    if (!metadata) throw new CustomError("Content Not Found", 404);
    const imageStream = file.createReadStream();
    res.setHeader("Content-Type", "image/webp");
    imageStream.pipe(res);
});

app.get("/videos", async (req, res) => {
    const videoNames = await Video.find({});
    res.json({ videoNames });
});

app.use(notFound);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}...`);
});
