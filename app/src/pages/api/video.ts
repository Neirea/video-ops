import { NextApiRequest, NextApiResponse } from "next";
import { Storage } from "@google-cloud/storage";
import CustomError from "@/utils/CustomError";

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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

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
}
