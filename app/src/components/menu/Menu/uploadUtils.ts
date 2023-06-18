export async function createUpload(token: string, fileName: string) {
    const uploadResult = await fetch("/api/create-upload", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            token: token,
        },
        body: JSON.stringify({
            key: fileName,
        }),
    });
    if (!uploadResult.ok) {
        throw await uploadResult.json();
    }
    const { UploadId, Key } = await uploadResult.json();
    return { UploadId, Key };
}

export async function getUploadUrls(
    token: string,
    UploadId: string,
    Key: string,
    chunkCount: number
) {
    const uploadUrlsResult = await fetch("/api/get-upload-urls", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            token: token,
        },
        body: JSON.stringify({
            UploadId,
            Key,
            parts: chunkCount,
        }),
    });
    if (!uploadUrlsResult.ok) throw await uploadUrlsResult.json();
    const { parts } = await uploadUrlsResult.json();
    return parts;
}

export async function trackUpload(
    chunksArray: (string | ArrayBuffer)[],
    fileSize: number,
    parts: any[],
    handleStatus: (v: string) => void
) {
    const reqProgress: {
        current: number;
        total: number;
        items: number[];
    } = { total: fileSize, current: 0, items: [] };
    const partRequests: any[] = [];
    for (let i = 0; i < chunksArray.length; i++) {
        reqProgress.items[i] = 0;
        partRequests.push(
            trackedRequest({
                url: parts[i].signedUrl,
                body: chunksArray[i],
                idx: i,
                reqProgress,
                handleStatus,
            })
        );
    }
    const partResults = await Promise.all(partRequests);
    const results = partResults.map(({ ETag, PartNumber }) => {
        return {
            ETag,
            PartNumber,
        };
    });
    return results;
}

export async function completeUpload(
    token: string,
    UploadId: string,
    Key: string,
    results: {
        ETag: any;
        PartNumber: any;
    }[]
) {
    const completeResult = await fetch("/api/complete-upload", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            token: token,
        },
        body: JSON.stringify({
            Key,
            UploadId,
            parts: results,
        }),
    });
    if (!completeResult.ok) throw await completeResult.json();
    await completeResult.json();
}

export function splitBuffer(
    buffer: string | ArrayBuffer,
    chunkCount: number,
    chunkSize: number
) {
    const chunksArray = [];

    for (let chunkId = 0; chunkId < chunkCount; chunkId++) {
        const chunk = buffer.slice(
            chunkId * chunkSize,
            chunkId * chunkSize + chunkSize
        );
        chunksArray.push(chunk);
    }
    return chunksArray;
}

export function createWSConnection(fileName: string) {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
    socket.addEventListener("open", () => {
        socket.send(
            JSON.stringify({
                type: "upload",
                fileName: fileName,
            })
        );
    });
    return socket;
}

export function trackedRequest({
    url,
    body,
    idx,
    reqProgress,
    handleStatus,
}: {
    url: string;
    body: any;
    idx: number;
    reqProgress: {
        current: number;
        total: number;
        items: number[];
    };
    handleStatus: (v: string) => void;
}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
            // curr = curr - prev_val + curr_val
            reqProgress.current =
                reqProgress.current - reqProgress.items[idx] + e.loaded;
            reqProgress.items[idx] = e.loaded;

            handleStatus(
                `${Math.floor(
                    (reqProgress.current / reqProgress.total) * 100
                )}%`
            );
        });
        xhr.open("PUT", url);
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
