import deriveImages from "./deriveImages";

export default async function getThumbnails(imgName: string) {
    const thumbnailCollage = await fetch(`/api/image?img=${imgName}`)
        .then((res) => res.blob())
        .then((blob) => URL.createObjectURL(blob))
        .catch((e) => console.log(e));
    if (thumbnailCollage) {
        const result = await deriveImages(thumbnailCollage);

        return result;
    }

    throw new Error("Failed to get thumbnails");
}
