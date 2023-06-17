import "dotenv/config";
import http, { IncomingMessage, ServerResponse } from "http";
import mongoose from "mongoose";
import { WebSocket, WebSocketServer } from "ws";
import Bull from "bull";
import { processVideo } from "./process";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    body?: any
) => void;

type RouteDefinition = {
    [method in HttpMethod]?: {
        [url: string]: RouteHandler;
    };
};
const handleProcessRoute = (
    req: IncomingMessage,
    res: ServerResponse,
    body: any
) => {
    const myUrl = new URL(req.url!, `http://${req.headers.host}`);
    const query = myUrl.searchParams;
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
};
const routing: RouteDefinition = {
    POST: {
        "/pubsub/push": handleProcessRoute,
    },
};

const handleRequests = (
    req: IncomingMessage,
    res: ServerResponse,
    body: Buffer
) => {
    const method = req.method as HttpMethod;
    const url = req.url?.split("?")[0] || "/"; // route url
    const handler = routing[method]?.[url];
    if (handler) {
        handler(req, res, body);
        return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Route was not found" }));
};

const server = http.createServer((req, res) => {
    let chunks: any[] = [];
    req.on("data", (chunk) => {
        chunks.push(chunk);
    });
    req.on("end", () => {
        try {
            const body = Buffer.concat(chunks);
            //parsing JSON body
            let parsedBody;
            if (req.headers["content-type"] === "application/json") {
                try {
                    parsedBody = JSON.parse(body.toString());
                } catch (error) {
                    parsedBody = {};
                }
            }
            handleRequests(req, res, parsedBody);
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

const wss = new WebSocketServer({ server });
type videoFile = { rawName: string };
const queue: Bull.Queue<videoFile> = new Bull("transcode");

queue.process(async (job) => {
    const { rawName } = job.data;
    await processVideo(rawName);
});

export const wsChat: {
    sendTo: (socketId: string, message: string | Object) => void;
    sockets: {
        [key: string]: WebSocket;
    };
} = {
    sendTo(socketId: string, message: string | Object) {
        if (wsChat.sockets[socketId]) {
            wsChat.sockets[socketId].send(JSON.stringify(message));
        }
    },
    sockets: {},
};

wss.on("connection", (socket) => {
    socket.on("message", (rawData) => {
        const data = JSON.parse(rawData.toString());
        //join room based on fileName
        if (data.type === "upload" && !wsChat.sockets[data.fileName]) {
            wsChat.sockets[data.fileName] = socket;
        }
    });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    //connect to db
    mongoose.set("strictQuery", false);
    mongoose.connect(process.env.MONGO_URL!);
    console.log(`server is running on port ${PORT}...`);
});
