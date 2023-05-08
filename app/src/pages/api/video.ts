import { NextApiRequest, NextApiResponse } from "next";
import { storage } from "@/utils/storage";
import toNumber from "@/utils/toNumber";

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
    if (!metadata) {
        res.status(404).json({ message: "Video was not found" });
        return;
    }
    const videoSize = metadata[0].size;

    // Parse Range
    // Example: "bytes=0-1" or "bytes=0-"
    const CHUNK_SIZE = 3 * 10 ** 6; // 3MB if end is not specified
    const parts = range.replace("bytes=", "").split("-");
    const start = toNumber(parts[0]) || 0;
    const end =
        toNumber(parts[1]) || Math.min(start + CHUNK_SIZE, videoSize - 1);

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
