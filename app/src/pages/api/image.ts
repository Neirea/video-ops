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
    const imgName = req.query.img as string;
    const file = storage
        .bucket(process.env.GCP_PROD_BUCKET!)
        .file(imgName + ".webp");
    const metadata = await file.getMetadata();
    if (!metadata) throw new CustomError("Content Not Found", 404);
    const imageStream = file.createReadStream();
    res.setHeader("Content-Type", "image/webp");
    imageStream.pipe(res);
}
