import { Video } from "@/models/Video";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const videoNames = await Video.find({});
    res.json({ videoNames });
}
