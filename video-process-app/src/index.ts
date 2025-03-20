import http from "http";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import { handleUpload } from "./controllers.js";
import { processVideo } from "./process.js";
import Connections from "./utils/WSChat.js";
import { createQueue } from "./utils/createQueue.js";

type videoFile = { rawName: string };

export const wsChat = new Connections();
export const queue = createQueue<videoFile>();
// queue
queue.process(async (job) => {
    const { rawName } = job.data;
    await processVideo(rawName);
});

/* HTTP server */
const parseBody = (req: http.IncomingMessage, body: Buffer) => {
    let parsedBody;
    //parsing JSON body
    if (req.headers["content-type"] === "application/json") {
        try {
            parsedBody = JSON.parse(body.toString());
        } catch (error) {
            parsedBody = {};
        }
    }

    return parsedBody || body;
};

const server = http.createServer((req, res) => {
    let chunks: any[] = [];
    req.on("data", (chunk) => {
        chunks.push(chunk);
    }).on("end", () => {
        try {
            const rawBody = Buffer.concat(chunks);
            const body = parseBody(req, rawBody);
            // the only route
            if (
                req.url?.startsWith("/pubsub/push") &&
                (req.method === "OPTIONS" || req.method === "POST")
            ) {
                handleUpload(req, res, body);
            } else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(
                    JSON.stringify({
                        message: "Route was not found",
                    })
                );
            }
        } catch (error) {
            console.log(error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    message: "Something went wrong try again later",
                })
            );
        }
    });
});

/* WS server */
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
    socket.on("message", (rawData) => {
        const data = JSON.parse(rawData.toString());
        //join room based on fileName
        const existingValue = wsChat.sockets.get(data.fileName);
        if (data.type === "upload" && !existingValue) {
            wsChat.sockets.set(data.fileName, socket);
        }
    });
    socket.on("close", () => {
        wsChat.sockets.forEach((value, key) => {
            if (value?.CLOSED) {
                wsChat.close(key);
            }
        });
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!);
        console.log(`server is running on port ${PORT}...`);
    } catch (error) {
        console.log("Connection to db failed...");
    }
});
