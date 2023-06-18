import "dotenv/config";
import http, { IncomingMessage, ServerResponse } from "http";
import mongoose from "mongoose";
import { WebSocket, WebSocketServer } from "ws";
import { processVideo } from "./process";
import { createClient } from "redis";
import AsyncQueue from "./AsyncQueue";

type videoFile = { rawName: string };
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
// queue
const queueClient = createClient();
queueClient.on("error", (error) => {
    console.error(error);
    process.exit(1);
});
queueClient.connect();
const queue = new AsyncQueue<videoFile>(queueClient, "transcode");

queue.process(async (job) => {
    const { rawName } = job.data;
    await processVideo(rawName);
});

process.on("SIGINT", queueClient.disconnect);
process.on("SIGTERM", queueClient.disconnect);

// routes
const routing: RouteDefinition = {
    POST: {
        "/pubsub/push": handleProcessRoute,
    },
};
// the only route handler
function handleProcessRoute(
    req: IncomingMessage,
    res: ServerResponse,
    body: any
) {
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
}

const parseBody = (req: IncomingMessage, body: Buffer) => {
    let parsedBody;
    //parsing JSON body
    if (req.headers["content-type"] === "application/json") {
        try {
            parsedBody = JSON.parse(body.toString());
        } catch (error) {
            parsedBody = {};
        }
    }
    return parsedBody;
};

const serveRequests = (
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

/* HTTP server */
const server = http.createServer((req, res) => {
    let chunks: any[] = [];
    req.on("data", (chunk) => {
        chunks.push(chunk);
    }).on("end", () => {
        try {
            const rawBody = Buffer.concat(chunks);
            const body = parseBody(req, rawBody);
            serveRequests(req, res, body);
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

export const wsChat: {
    sendTo: (socketId: string, message: string | Object) => void;
    sockets: {
        [key: string]: WebSocket | undefined;
    };
} = {
    sendTo(socketId: string, message: string | Object) {
        wsChat.sockets[socketId]?.send(JSON.stringify(message));
    },
    sockets: {},
};

export const closeConnection = (socketId: string) => {
    wsChat.sockets[socketId]?.close();
    wsChat.sockets[socketId] = undefined;
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
server.listen(PORT, async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL!);
        console.log(`server is running on port ${PORT}...`);
    } catch (error) {
        console.log("Connection to db failed...");
    }
});
