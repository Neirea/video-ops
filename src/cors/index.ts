import { Storage } from "@google-cloud/storage";
import "dotenv/config";
import path from "path";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME!;

const gc = new Storage({
    keyFilename: path.join(
        __dirname,
        "../../video-streaming-377513-0c9fb4a8d8f6.json"
    ),
    projectId: process.env.GCP_PROJECT_ID,
});

// Execute this function by command "npm run setup-cors"
// only if CORS is not set up
async function configureBucketCors() {
    await gc.bucket(BUCKET_NAME).setCorsConfiguration([
        {
            maxAgeSeconds: 3600,
            method: ["GET", "PUT"],
            origin: ["*"],
            responseHeader: ["*"],
        },
    ]);

    console.log(`Bucket ${BUCKET_NAME} was updated with a CORS config`);
}

configureBucketCors().catch(console.error);
