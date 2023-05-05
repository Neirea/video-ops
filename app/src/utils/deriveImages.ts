export default function deriveImages(source: string): Promise<string[]> {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", {
        willReadFrequently: true,
    })!;
    const thumbnailCollage = new Image();
    thumbnailCollage.crossOrigin = "anonymous";
    thumbnailCollage.src = source;
    return new Promise((resolve, reject) => {
        thumbnailCollage.onload = async function () {
            canvas.width = thumbnailCollage.width;
            canvas.height = thumbnailCollage.height;

            // draw the thumbnail collage on the canvas
            context.drawImage(thumbnailCollage, 0, 0);

            // loop through each thumbnail in the collage and extract it
            const thumbnailWidth = 128;
            const thumbnailHeight = 72;
            const numThumbnails = 100; // set the number of thumbnails in the collage
            const thumbnails = [];
            // tmp canvas to put ImageData derived from main canvas
            const tmpCanvas = document.createElement("canvas");
            const tmoContext = tmpCanvas.getContext("2d");
            tmpCanvas.width = thumbnailWidth;
            tmpCanvas.height = thumbnailHeight;
            for (let i = 0; i < numThumbnails; i++) {
                // calculate the position of the current thumbnail in the collage
                const x = (i % 10) * thumbnailWidth;
                const y = Math.floor(i / 10) * thumbnailHeight;

                // extract the current thumbnail from the canvas
                const thumbnail = context.getImageData(
                    x,
                    y,
                    thumbnailWidth,
                    thumbnailHeight
                );
                tmoContext!.putImageData(thumbnail, 0, 0);
                const url = await getCanvasBlobUrl(tmpCanvas);
                thumbnails.push(url);
            }

            //remove source
            tmpCanvas.remove();
            canvas.remove();
            URL.revokeObjectURL(source);
            //resolve blob urls of images
            resolve(thumbnails);
        };
        thumbnailCollage.onerror = reject;
    });
}

function getCanvasBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob!);

            resolve(url);
        });
    });
}
