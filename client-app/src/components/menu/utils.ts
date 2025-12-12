type PartType = {
    signedUrl: string;
    PartNumber: number;
};

type ResultType = { ETag: string | undefined; PartNumber: number };

export async function trackUpload(
    chunksArray: (string | ArrayBuffer)[],
    fileSize: number,
    parts: PartType[],
    handleStatus: (v: string) => void,
) {
    const reqProgress: {
        current: number;
        total: number;
        items: number[];
    } = { total: fileSize, current: 0, items: [] };
    const partRequests: Promise<ResultType>[] = [];
    for (let i = 0; i < chunksArray.length; i++) {
        reqProgress.items[i] = 0;
        partRequests.push(
            trackedRequest({
                url: parts[i].signedUrl,
                body: chunksArray[i],
                idx: i,
                reqProgress,
                handleStatus,
            }),
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

export function splitBuffer(
    buffer: string | ArrayBuffer,
    chunkCount: number,
    chunkSize: number,
) {
    const chunksArray = [];

    for (let chunkId = 0; chunkId < chunkCount; chunkId++) {
        const chunk = buffer.slice(
            chunkId * chunkSize,
            chunkId * chunkSize + chunkSize,
        );
        chunksArray.push(chunk);
    }
    return chunksArray;
}

export function createWSConnection(fileName: string) {
    const url =
        process.env.NODE_ENV !== "production"
            ? "ws://localhost:8080"
            : process.env.NEXT_PUBLIC_WS_URL!;
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => {
        socket.send(
            JSON.stringify({
                type: "upload",
                fileName: fileName,
            }),
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
    body: string | ArrayBuffer;
    idx: number;
    reqProgress: {
        current: number;
        total: number;
        items: number[];
    };
    handleStatus: (v: string) => void;
}): Promise<ResultType> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
            // curr = curr - prev_val + curr_val
            reqProgress.current =
                reqProgress.current - reqProgress.items[idx] + e.loaded;
            reqProgress.items[idx] = e.loaded;

            handleStatus(
                `${Math.floor(
                    (reqProgress.current / reqProgress.total) * 100,
                )}%`,
            );
        });
        xhr.open("PUT", url);
        xhr.onload = function () {
            if (xhr.status === 200) {
                const ETag = xhr.getResponseHeader("ETag");
                resolve({ ETag: ETag || undefined, PartNumber: idx + 1 });
            }
        };
        xhr.onerror = function (error) {
            console.log(error);
            reject(new Error("Network error during upload"));
        };
        xhr.onabort = function () {
            reject(new Error("Upload cancelled by user"));
        };
        xhr.send(body);
    });
}
