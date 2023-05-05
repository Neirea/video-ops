import { NextApiRequest, NextApiResponse } from "next";
import { storage } from "@/utils/storage";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const imgName = req.query.img as string;
    const file = storage
        .bucket(process.env.GCP_PROD_BUCKET!)
        .file(imgName + ".webp");
    const metadata = await file.getMetadata();
    if (!metadata) {
        res.status(404).json({ message: "Image not found" });
        return;
    }
    const imageStream = file.createReadStream();
    res.setHeader("Content-Type", "image/webp");
    imageStream.pipe(res);
}
