import { Video } from "@/models/Video";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // get JSON without _id
    const videoNames = await Video.find({},'-_id url name').lean();
    res.json({ videoNames });
}
