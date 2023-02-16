import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { Storage } from "@google-cloud/storage";
import "dotenv/config";
import express from "express";
import "express-async-errors";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import Video from "./model";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.APP_URL,
    },
});

io.on("connection", (socket) => {
    //connect into room that has fileName as ID
    socket.on("upload", (fileName, cb) => {
        socket.join(fileName);
        cb("Initiated upload");
    });
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

const bucket_raw = storage.bucket("raw-video-streaming");
const bucket_prod = storage.bucket("prod-video-streaming");

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL!);

app.set("trust proxy", true);
app.use(cors({ origin: process.env.APP_URL }));

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
    const fileName = data.name;
    console.log(`File name: ${fileName}`);
    //get file out of storage
    const tmpInputFile = `input-${fileName}`;
    await bucket_raw.file(fileName).download({ destination: tmpInputFile });

    //check if input file is video file
    let isError = false;
    ffprobe(tmpInputFile, { path: ffprobeStatic.path }, function (err, info) {
        if (err) {
            const myURL = new URL(process.env.APP_URL!);
            io.to(fileName).emit("status", { error: err.message });
            console.error("ffprobe error:", err.message);
            isError = true;
            return;
        }
        console.log(
            `Video file is correct with duration ${info.streams[0].duration}`
        );
    });

    if (isError) return;

    const videoBitrate360 = "1000k";
    const videoBitrate480 = "2500k";
    const videoBitrate720 = "5000k";
    const audioBitrate = "384k";
    const width360 = 480;
    const height360 = 360;
    const width720 = 1280;
    const height720 = 720;
    const width480 = 854;
    const height480 = 480;

    //process files
    const commandsBatch = [];

    commandsBatch.push(
        ffmpegCommand(tmpInputFile, width360, height360, videoBitrate360).then(
            (res) => {
                io.to(fileName).emit("status", {
                    status: `${height360}p video has been processed`,
                });
                return res;
            }
        )
    );
    commandsBatch.push(
        ffmpegCommand(tmpInputFile, width480, height480, videoBitrate480).then(
            (res) => {
                io.to(fileName).emit("status", {
                    status: `${height480}p video has been processed`,
                });
                return res;
            }
        )
    );
    commandsBatch.push(
        ffmpegCommand(tmpInputFile, width720, height720, videoBitrate720).then(
            (res) => {
                io.to(fileName).emit("status", {
                    status: `${height720}p video has been processed`,
                });
                return res;
            }
        )
    );

    try {
        await Promise.all(commandsBatch);

        //delete junk
        await fs.unlink(tmpInputFile);
        await bucket_raw.file(fileName).delete();
        //save it to DB
        const low = `${fileName.split(".")[0]}_360.mp4`;
        const normal = `${fileName.split(".")[0]}_480.mp4`;
        const high = `${fileName.split(".")[0]}_720.mp4`;

        const url_low = bucket_prod.file(low).publicUrl();
        const url_normal = bucket_prod.file(normal).publicUrl();
        const url_high = bucket_prod.file(high).publicUrl();

        await Video.create({
            name: fileName,
            low: url_low,
            normal: url_normal,
            high: url_high,
        });
        io.to(fileName).emit("status", {
            status: "done",
        });
    } catch (err) {
        io.to(fileName).emit("status", { error: (err as Error).message });
    }

    function ffmpegCommand(
        input: string,
        width: number,
        height: number,
        videoBitrate: string
    ) {
        const outputFileName = `${fileName.split(".")[0]}_${height}.mp4`;
        const outputStream = bucket_prod
            .file(outputFileName)
            .createWriteStream();
        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .setFfmpegPath(ffmpegPath)
                .videoCodec("libx264")
                .size(`${width}x${height}`)
                .fps(30)
                .videoBitrate(videoBitrate)
                .audioBitrate(audioBitrate)
                .autopad()
                .outputFormat("mp4")
                .outputOptions("-preset fast")
                .outputOptions(["-movflags frag_keyframe+empty_moov"])
                .pipe(outputStream, { end: true })
                .on("finish", async () => {
                    console.log(
                        `Video with resolution ${height}p has been successfully processed!`
                    );
                    resolve(outputFileName);
                })
                .on("error", (err) => {
                    console.error(`Video Processing Error: ${err.message}`);
                    reject(err.message);
                });
        });
    }
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`server is running on port ${PORT}...`);
});
