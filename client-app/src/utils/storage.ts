import { S3Client } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";

//api for multipart upload
const bucketClient = new S3Client({
    endpoint: "https://storage.googleapis.com",
    credentials: {
        accessKeyId: process.env.GCP_ACCESS_KEY!,
        secretAccessKey: process.env.GCP_SECRET_ACCESS_KEY!,
    },
    region: process.env.GCP_BUCKET_REGION!,
});

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

export { storage, bucketClient };
