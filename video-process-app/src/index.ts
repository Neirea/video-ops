import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { Storage } from "@google-cloud/storage";
import "dotenv/config";
import express from "express";
import "express-async-errors";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import { createReadStream } from "fs";
import fs from "fs/promises";
import http from "http";
import mongoose from "mongoose";
import { WebSocket, WebSocketServer } from "ws";
import errorHandlerMiddleware from "./middleware/error-handle";
import notFound from "./middleware/not-found";
import Video from "./model";
import Bull from "bull";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
type videoFile = { rawName: string };
const queue: Bull.Queue<videoFile> = new Bull("transcode");

let wsChat: { [key: string]: WebSocket } = {};

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

const bucket_raw = storage.bucket("raw-video-streaming");
const bucket_prod = storage.bucket("prod-video-streaming");

queue.process(async (job) => {
    const { rawName } = job.data;
    await processVideo(rawName);
});

wss.on("connection", (socket) => {
    socket.on("message", (rawData) => {
        const data = JSON.parse(rawData.toString());
        //join room based on fileName
        if (data.type === "upload" && !wsChat[data.fileName]) {
            wsChat[data.fileName] = socket;
        }
    });
});

app.set("trust proxy", true);

app.post("/pubsub/push", express.json(), async (req, res) => {
    if (req.query.token !== process.env.PUBSUB_VERIFICATION_TOKEN) {
        console.error(`wrong env: ${process.env.PUBSUB_VERIFICATION_TOKEN}`);
        res.status(400).send();
        return;
    }
    // The pub/sub message is a unicode string encoded in base64.
    const data = JSON.parse(
        Buffer.from(req.body.message.data, "base64").toString().trim()
    );
    //queue up processing
    queue.add({
        rawName: data.name,
    });
    res.status(200).send();
});

app.use(notFound);
app.use(errorHandlerMiddleware);

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    //connect to db
    mongoose.set("strictQuery", false);
    mongoose.connect(process.env.MONGO_URL!);
    console.log(`server is running on port ${PORT}...`);
});

async function processVideo(rawName: string) {
    // The pub/sub message is a unicode string encoded in base64.
    const splitRawName = rawName.split("@@@");
    if (splitRawName.length !== 2) {
        sendTo(rawName, {
            status: "error",
            msg: "Failed to proceed transcoding",
        });
    }
    const videoName = splitRawName[0];
    const fileName = splitRawName[1];
    const urlName = fileName.split(".")[0]; // video_name
    //get file out of storage
    const file = bucket_raw.file(rawName);
    //check file size
    const metadata = await file.getMetadata();
    if (metadata[0].size > 2 * 10 ** 9) {
        sendTo(rawName, {
            status: "error",
            msg: "File is too big",
        });
        await file.delete();
        return;
    }
    await file.download({ destination: urlName });

    //check if input file is video file
    let isError = false;
    const commandsBatch = [];

    ffprobe(urlName, { path: ffprobeStatic.path }, async (err, info) => {
        const duration = info.streams[0].duration;
        if (err || !duration) {
            sendTo(rawName, {
                status: "error",
                msg: err.message || "Probe Error",
            });
            isError = true;
            await file.delete();
            return;
        }
        commandsBatch.push(
            ffmpegScrn(urlName, duration).then((res) => {
                sendTo(rawName, {
                    status: "checked",
                    msg: "Thumbnails are generated",
                });
                return res;
            })
        );
        sendTo(rawName, {
            status: "checked",
            msg: `Video is valid with duration ${Math.trunc(duration)}s`,
        });
    });

    if (isError) return;

    const height480 = 480;
    const height720 = 720;
    const height1080 = 1080;

    //process files
    commandsBatch.push(
        ffmpegCommand(urlName, height480).then((res) => {
            sendTo(rawName, {
                status: "processed",
                msg: `${height480}p`,
            });
            return res;
        })
    );
    commandsBatch.push(
        ffmpegCommand(urlName, height720).then((res) => {
            sendTo(rawName, {
                status: "processed",
                msg: `${height720}p`,
            });
            return res;
        })
    );
    commandsBatch.push(
        ffmpegCommand(urlName, height1080).then((res) => {
            sendTo(rawName, {
                status: "processed",
                msg: `${height1080}p`,
            });
            return res;
        })
    );
    console.log(`Starting transcoding video - ${urlName}`);

    try {
        await Promise.all(commandsBatch);

        //save it to DB
        await Video.create({
            name: videoName,
            url: urlName,
        });
        sendTo(rawName, {
            status: "done",
            msg: urlName,
            name: videoName,
        });
    } catch (err) {
        sendTo(rawName, {
            status: "error",
            msg: (err as Error).message,
        });
    } finally {
        //delete junk
        fs.unlink(urlName);
        await file.delete();
    }
}

function sendTo(socketId: string, message: string | Object) {
    if (wsChat[socketId]) {
        wsChat[socketId].send(JSON.stringify(message));
    }
}

function ffmpegCommand(input: string, height: number) {
    const width = Math.ceil((height / 9) * 16);
    const outputFileName = `${input}_${height}.mp4`;
    const outputTmp = "tmp-" + outputFileName;
    const outputStream = bucket_prod.file(outputFileName).createWriteStream();

    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .setFfmpegPath(ffmpegPath)
            .outputOptions([
                "-c:v libx264",
                "-preset veryslow", //slower=>better quality
                "-r 30", //fps 30
                "-b:a 192k", //audio bitrate
                `-vf scale=w=${width}:h=${height},pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,colormatrix=bt470bg:bt709`, //pad with black bars
                "-color_range 1",
                "-colorspace 1",
                "-color_primaries 1",
                "-color_trc 1",
                "-movflags +faststart", //pushes info to beginning
                "-crf 28", //scale bitrate dynamically
            ])
            .output(outputTmp)
            .on("end", async () => {
                //upload to google cloud storage
                createReadStream(outputTmp)
                    .pipe(outputStream)
                    .on("finish", () => {
                        //delete output after upload
                        fs.unlink(outputTmp);
                        resolve(outputFileName);
                    });
            })
            .on("error", (err) => {
                reject(err.message);
            })
            .run();
    });
}

function ffmpegScrn(input: string, duration: number) {
    const outputFileName = `${input.split(".")[0]}.webp`;
    const frameInterval = duration / 100;
    const outputStream = bucket_prod.file(outputFileName).createWriteStream();

    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .setFfmpegPath(ffmpegPath)
            .outputOptions([
                `-vf fps=1/${frameInterval},scale=128:72:force_original_aspect_ratio=decrease,pad=128:72:-1:-1:color=black,tile=10x10`,
                "-frames:v 1",
                "-q:v 50",
            ])
            .output(outputFileName)
            .on("end", async () => {
                createReadStream(outputFileName)
                    .pipe(outputStream)
                    .on("finish", () => {
                        //delete output after upload
                        fs.unlink(outputFileName);
                        resolve(outputFileName);
                    });
            })
            .on("error", (err) => {
                reject(err.message);
            })
            .run();
    });
}
