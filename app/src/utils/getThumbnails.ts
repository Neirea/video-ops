import deriveImages from "./deriveImages";

export default async function getThumbnails(imgName: string) {
    // `/image?img=${imgName}`
    const thumbnailCollage = await fetch(imgName)
        .then((res) => res.blob())
        .then((blob) => URL.createObjectURL(blob))
        .then((res) => {
            //get images for preview

            return res;
        })
        .catch((e) => console.log(e));
    if (thumbnailCollage) {
        const result = await deriveImages(thumbnailCollage);

        // .then((res) => {
        // add: assign thumbnails as result of this function
        // thumbnails = [...res];
        return result;
        // });
    }

    throw new Error("Failed to get thumbnails");
}
