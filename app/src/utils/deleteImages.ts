export default function deleteImages(thumbnails: string[]) {
    if (!thumbnails.length) return;
    thumbnails.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    //empty array
    while (thumbnails.length > 0) {
        thumbnails.pop();
    }
}
