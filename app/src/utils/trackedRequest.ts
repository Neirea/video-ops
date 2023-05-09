import { Dispatch, SetStateAction } from "react";

export default function trackedRequest(
    url: string,
    method: string,
    body: any,
    idx: number,
    reqProgress: {
        total: number;
        items: { loaded: number }[];
    },
    setStatus: Dispatch<SetStateAction<string>>
) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
            reqProgress.items[idx].loaded = e.loaded;
            const currentProgress = Object.keys(reqProgress.items).reduce(
                (prev, curr) => {
                    const currNumber = +curr;
                    return isNaN(currNumber)
                        ? prev
                        : prev + reqProgress.items[currNumber].loaded;
                },
                0
            );
            setStatus(
                `${Math.floor((currentProgress / reqProgress.total) * 100)}%`
            );
        });
        xhr.open(method, url);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const ETag = xhr.getResponseHeader("ETag");
                resolve({ ETag, PartNumber: idx + 1 });
            }
        };
        xhr.onerror = function (error) {
            reject(error);
        };
        xhr.onabort = function () {
            reject(new Error("Upload cancelled by user"));
        };
        xhr.send(body);
    });
}
