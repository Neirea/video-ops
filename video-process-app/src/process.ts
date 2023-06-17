import { Storage } from "@google-cloud/storage";
import { wsChat } from ".";
import Video from "./model";
import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import fs from "fs";

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

export async function processVideo(rawName: string) {
    // The pub/sub message is a unicode string encoded in base64.
    const splitRawName = rawName.split("@@@");
    if (splitRawName.length !== 2) {
        wsChat.sendTo(rawName, {
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
        wsChat.sendTo(rawName, {
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
            wsChat.sendTo(rawName, {
                status: "error",
                msg: err.message || "Probe Error",
            });
            isError = true;
            await file.delete();
            return;
        }
        commandsBatch.push(
            ffmpegScrn(urlName, duration).then((res) => {
                wsChat.sendTo(rawName, {
                    status: "checked",
                    msg: "Thumbnails are generated",
                });
                return res;
            })
        );
        wsChat.sendTo(rawName, {
            status: "checked",
            msg: `Video is valid with duration ${Math.trunc(duration)}s`,
        });
    });

    if (isError) return;

    const height480 = 480;
    const height720 = 720;
    const height1080 = 1080;

    //process files
    commandsBatch.push(videoTrancodeCommand(urlName, rawName, height480));
    commandsBatch.push(videoTrancodeCommand(urlName, rawName, height720));
    commandsBatch.push(videoTrancodeCommand(urlName, rawName, height1080));
    console.log(`Starting transcoding video - ${urlName}`);

    try {
        await Promise.all(commandsBatch);

        //save it to DB
        await Video.create({
            name: videoName,
            url: urlName,
        });
        wsChat.sendTo(rawName, {
            status: "done",
            msg: urlName,
            name: videoName,
        });
    } catch (err) {
        wsChat.sendTo(rawName, {
            status: "error",
            msg: (err as Error).message,
        });
    } finally {
        //delete junk
        fs.unlink(urlName, () => {});
        await file.delete();
    }
}

async function videoTrancodeCommand(
    urlName: string,
    rawName: string,
    height: number
) {
    return ffmpegCommand(urlName, height).then((res) => {
        wsChat.sendTo(rawName, {
            status: "processed",
            msg: `${height}p`,
        });
        return res;
    });
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
                fs.createReadStream(outputTmp)
                    .pipe(outputStream)
                    .on("finish", () => {
                        //delete output after upload
                        fs.unlink(outputTmp, () => {});
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
                fs.createReadStream(outputFileName)
                    .pipe(outputStream)
                    .on("finish", () => {
                        //delete output after upload
                        fs.unlink(outputFileName, () => {});
                        resolve(outputFileName);
                    });
            })
            .on("error", (err) => {
                reject(err.message);
            })
            .run();
    });
}
