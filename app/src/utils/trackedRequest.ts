export default function trackedRequest({
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
