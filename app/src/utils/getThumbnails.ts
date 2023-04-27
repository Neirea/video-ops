import deriveImages from "./deriveImages";

export default function getThumbnails(imgName: string) {
    let result;
    fetch(`/image?img=${imgName}`)
        .then((res) => res.blob())
        .then((blob) => URL.createObjectURL(blob))
        .then((thumbnailCollage) => {
            //get images for preview
            deriveImages(thumbnailCollage).then((res) => {
                // add: assign thumbnails as result of this function
                // thumbnails = [...res];
                result = res;
            });
        })
        .catch((e) => console.log(e));
    if (!result) throw new Error("Failed to get thumbnails");
    return result;
}
