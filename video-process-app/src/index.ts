import "dotenv/config";
import "express-async-errors";
import express from "express";
import https from "https";
// import path from "path";
import fs from "fs/promises";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import { Storage } from "@google-cloud/storage";

const app = express();
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
    const fileName = data.name;
    console.log(`File name:${fileName}`);
    //get file out of storage
    const tmpInputFile = `input-${fileName}`;
    await bucket_raw.file(fileName).download({ destination: tmpInputFile });

    //check if input file is video file
    ffprobe(tmpInputFile, { path: ffprobeStatic.path }, function (err, info) {
        if (err) {
            // https.get({
            //     url: "http://my-website-url.com/video-processes?success=false",
            //     headers: {
            //         "Error-Message": err.message,
            //     },
            // });
            console.error("probe failed", info);
            return;
        }
        console.log(`Metadata: ${info}`);
    });

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
        ffmpegCommand(tmpInputFile, width360, height360, videoBitrate360)
    );
    commandsBatch.push(
        ffmpegCommand(tmpInputFile, width480, height480, videoBitrate480)
    );
    commandsBatch.push(
        ffmpegCommand(tmpInputFile, width720, height720, videoBitrate720)
    );
    try {
        await Promise.all(commandsBatch);
        console.log("Processed all files");
        await fs.unlink(tmpInputFile);
        console.log("deleting tmp file");

        await bucket_raw.file(fileName).delete();
        console.log("deleting bucket input file");
    } catch (err) {
        // https.get({
        //     url: "http://my-website-url.com/video-processes?success=false",
        //     headers: {
        //         "Error-Message": err.message,
        //     },
        // });
    }

    // send request to my backend with result of function
    // https.get(
    //     "http://my-website-url.com/video-processes?success=true"
    // );

    function ffmpegCommand(
        input: string,
        width: number,
        height: number,
        videoBitrate: string
    ) {
        const outputFileName = `${fileName.split(".")[0]}_${height}.mp4`;
        console.log("Started processing video!");
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
                .on("progress", (progress) => {
                    console.log(`Processed frames: ${progress}`);
                })
                .on("finish", async () => {
                    console.log(
                        `Video with resolution ${height}p has been successfully processed!`
                    );
                    // delete raw video input and tmp file
                    // save to DB id + video links
                    // ..............

                    resolve(outputFileName);
                })
                .on("error", (err) => {
                    console.error(`Video Processing Error: ${err.message}`);
                    // https.get({
                    //     url: "http://my-website-url.com/video-processes?success=false",
                    //     headers: {
                    //         "Error-Message": err.message,
                    //     },
                    // });
                    reject(err.message);
                });
        });
    }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}...`);
});
