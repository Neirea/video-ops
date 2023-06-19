import { IncomingMessage, ServerResponse } from "node:http";

export function setupDevCors(req: IncomingMessage, res: ServerResponse) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000"); // Replace with the actual domain of your Next.js app
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
        // Respond to the preflight request
        res.writeHead(200, {
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400", // 24 hours
        });
        res.end();
        return true;
    }
    return false;
}
