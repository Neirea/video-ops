import { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs/promises";
import { queue } from ".";
import { setupDevCors } from "./utils/devCors";

// production upload handler
export function handleUpload(
    req: IncomingMessage,
    res: ServerResponse,
    body: any
) {
    if (process.env.NODE_ENV !== "production") {
        handleTestUpload(req, res, body);
        return;
    }
    const query = new URLSearchParams(req.url);
    const token = query.get("token");

    if (token !== process.env.PUBSUB_VERIFICATION_TOKEN) {
        console.error(`wrong env: ${process.env.PUBSUB_VERIFICATION_TOKEN}`);
        res.end();
        return;
    }
    // The pub/sub message is a unicode string encoded in base64.
    const data = JSON.parse(
        Buffer.from(body.message.data, "base64").toString().trim()
    );
    //queue up processing
    queue.add({
        rawName: data.name,
    });
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Success");
}

// development upload handler
async function handleTestUpload(
    req: IncomingMessage,
    res: ServerResponse,
    body: Buffer
) {
    //dev cors
    const isPreflight = setupDevCors(req, res);
    if (isPreflight) return;
    const rawName = req.headers["file-name"] as string;
    const splitRawName = rawName.split("@@@");
    const fileName = splitRawName[1];
    const urlName = fileName.split(".")[0]; // video_name
    await fs.writeFile(urlName, body); //download on disk
    queue.add({
        rawName,
    });
    res.end("success");
}
