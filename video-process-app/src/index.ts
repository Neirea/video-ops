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

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let wschat: { [key: string]: WebSocket } = {};

wss.on("connection", (socket) => {
    socket.on("message", (rawData) => {
        const data = JSON.parse(rawData.toString());
        //join room based on fileName
        if (data.type === "upload" && !wschat[data.fileName]) {
            console.log(`Joined chat with id: ${data.fileName}`);
            wschat[data.fileName] = socket;
        }
    });
});

function sendTo(socketId: string, message: string | Object) {
    if (wschat[socketId]) {
        wschat[socketId].send(JSON.stringify(message));
    }
}

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

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL!);

app.set("trust proxy", true);

app.post("/pubsub/push", express.json(), async (req, res) => {
    if (req.query.token !== process.env.PUBSUB_VERIFICATION_TOKEN) {
        console.error(`wrong env: ${process.env.PUBSUB_VERIFICATION_TOKEN}`);
        res.status(400).send();
        return;
    }
    res.status(200).send(); // responding earlier to acknowledge message is received
    // The pub/sub message is a unicode string encoded in base64.
    const data = JSON.parse(
        Buffer.from(req.body.message.data, "base64").toString().trim()
    );
    const fileName: string = data.name;
    const dbName = fileName.split(".")[0];
    //get file out of storage
    const tmpInputFile = `input-${fileName}`;
    await bucket_raw.file(fileName).download({ destination: tmpInputFile });

    //check if input file is video file
    let isError = false;
    ffprobe(tmpInputFile, { path: ffprobeStatic.path }, function (err, info) {
        if (err) {
            sendTo(fileName, { status: "error", msg: err.message });
            isError = true;
            return;
        }
        sendTo(fileName, {
            status: "checked",
            msg: `Video is valid with duration ${info.streams[0].duration}`,
        });
    });

    if (isError) return;

    const height480 = 480;
    const height720 = 720;
    const height1080 = 1080;

    //process files
    const commandsBatch = [];

    commandsBatch.push(
        ffmpegCommand(tmpInputFile, height480).then((res) => {
            sendTo(fileName, {
                status: "processed",
                msg: `${height480}p`,
            });
            return res;
        })
    );
    commandsBatch.push(
        ffmpegCommand(tmpInputFile, height720).then((res) => {
            sendTo(fileName, {
                status: "processed",
                msg: `${height720}p`,
            });
            return res;
        })
    );
    commandsBatch.push(
        ffmpegCommand(tmpInputFile, height1080).then((res) => {
            sendTo(fileName, {
                status: "processed",
                msg: `${height1080}p`,
            });
            return res;
        })
    );

    try {
        await Promise.all(commandsBatch);

        //save it to DB
        await Video.create({
            name: dbName,
        });
        sendTo(fileName, {
            status: "done",
            msg: dbName,
        });
    } catch (err) {
        sendTo(fileName, {
            status: "error",
            msg: (err as Error).message,
        });
    } finally {
        //delete junk
        fs.unlink(tmpInputFile);
        await bucket_raw.file(fileName).delete();
    }

    function ffmpegCommand(input: string, height: number) {
        const outputFileName = `${dbName}_${height}.mp4`;
        const outputTmp = "tmp-" + outputFileName;
        const outputStream = bucket_prod
            .file(outputFileName)
            .createWriteStream();

        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .setFfmpegPath(ffmpegPath)
                .videoCodec("libx264")
                .size(`?x${height}`)
                .aspect("16:9")
                .fps(30)
                .audioBitrate("192k")
                .autopad()
                .outputFormat("mp4")
                .outputOptions([
                    "-preset veryslow",
                    "-vf colormatrix=bt470bg:bt709",
                    "-color_range 1",
                    "-colorspace 1",
                    "-color_primaries 1",
                    "-color_trc 1",
                    "-movflags +faststart",
                    "-crf 28",
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
});

app.use(notFound);
app.use(errorHandlerMiddleware);

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}...`);
});
