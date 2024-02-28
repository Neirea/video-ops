import { storage } from "./storage";

// invalidate urls at 00:59:59.999 of tomorrow
function getExpirationDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.setHours(0, 59, 59, 999);
}

async function getImageUrl(videoUrl: string) {
    const file = storage
        .bucket(process.env.GCP_PROD_BUCKET!)
        .file(videoUrl + ".webp");
    const [imageUrl] = await file.getSignedUrl({
        action: "read",
        expires: getExpirationDate(),
    });
    return imageUrl;
}

export default getImageUrl;
