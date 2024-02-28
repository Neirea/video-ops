export default function deleteImages(thumbnails: string[]) {
    for (let i = 0; i < thumbnails.length; i++) {
        URL.revokeObjectURL(thumbnails[i]);
    }
}
