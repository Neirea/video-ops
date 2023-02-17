const btnUpload = document.querySelector(".btn-upload");
const fileContainer = document.querySelector(".file-container");
const fileSelected = document.querySelector(".file-selected");
const file = document.querySelector(".file");
const fileLabel = document.querySelector(".file-label");
// message elements
const statusContainer = document.querySelector(".status-container");
const statusMain = document.querySelector(".status-main");
const statusError = document.querySelector(".status-error");
// transcoding elements
const statusInit = document.querySelector(".status-init");
const statusVideo = document.querySelector(".status-video");
const status360 = document.querySelector(".status-360");
const status480 = document.querySelector(".status-480");
const status720 = document.querySelector(".status-720");
const statusDone = document.querySelector(".status-done");

// transcoding lines
const firstLine = document.querySelector(
    ".status-container > .status:first-child"
);
const secondLine = document.querySelector(
    ".status-container > .status:nth-child(2)"
);
const transcodeLine1 = document.querySelector(
    ".status-video-details li > span.status-360"
);
const transcodeLine2 = document.querySelector(
    ".status-video-details li > span.status-480"
);
const transcodeLine3 = document.querySelector(
    ".status-video-details li > span.status-720"
);

file.addEventListener("change", (e) => {
    if (e.target.value) {
        fileSelected.innerText = e.target.value;
    } else {
        fileSelected.innerHTML = "&nbsp;";
    }
});

btnUpload.addEventListener("click", () => {
    btnUpload.disabled = true;
    file.disabled = true;
    const fileReader = new FileReader();
    const theFile = file.files[0];
    const fileSize = theFile.size;
    fileReader.onload = async (ev) => {
        //check if file is bigger than 2GB
        if (ev.target.result.byteLength > 2147483648) return;
        let CHUNK_SIZE = 10485760; //10Mb - min size for chunk
        const BATCH_SIZE = 15;

        //if file is larger than 150Mb split into 15 chunks for parallel requests
        if (fileSize > BATCH_SIZE * CHUNK_SIZE) {
            CHUNK_SIZE = Math.floor(fileSize / (BATCH_SIZE - 1));
        }
        const chunkCount = Math.ceil(ev.target.result.byteLength / CHUNK_SIZE);

        const fileTypes = ["mp4", "mkv", "avi", "mov"];
        const extension = theFile.name.split(".").pop().toLowerCase();
        //can't do more than 10000 chunks for s3
        const isSuccess =
            fileTypes.indexOf(extension) > -1 && chunkCount <= 10000;
        const fileName = crypto.randomUUID() + `.${extension}`;

        if (isSuccess) {
            //initialize upload
            const uploadResult = await fetch("/create-upload", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: fileName,
                }),
            });
            const { UploadId, Key } = await uploadResult.json();

            //get urls for client to upload file chunks
            const uploadUrlsResult = await fetch("/get-upload-urls", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    UploadId,
                    Key,
                    parts: chunkCount,
                }),
            });
            const { parts } = await uploadUrlsResult.json();

            //result of s3 responses
            const chunksArray = [];
            const batchRequests = [];

            for (let chunkId = 0; chunkId < chunkCount; chunkId++) {
                const chunk = ev.target.result.slice(
                    chunkId * CHUNK_SIZE,
                    chunkId * CHUNK_SIZE + CHUNK_SIZE
                );
                chunksArray.push(chunk);
            }
            statusMain.textContent = "0%";

            //send requests in BATCH_SIZE batches for optimization
            chunksArray.forEach((item, idx) => {
                batchRequests.push(
                    fetch(parts[idx].signedUrl, {
                        method: "PUT",
                        body: item,
                    })
                );
            });
            const batchResult = await Promise.all(batchRequests);
            const results = batchResult.map((item, idx) => {
                return {
                    ETag: item.headers.get("ETag"),
                    PartNumber: idx + 1,
                };
            });
            //show progress of uploading
            statusMain.textContent = "Loading...";

            //finish uploading
            const completeResult = await fetch("/complete-upload", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    Key,
                    UploadId,
                    parts: results,
                }),
            });
            await completeResult.json();
            //----------------------------------------------
            btnUpload.style.display = "none";
            fileContainer.style.display = "none";
            statusContainer.classList.add("active");
            statusInit.classList.add("progress");
            statusMain.textContent = "Started transcoding process";
            //create websocket connection
            const socket = new WebSocket(
                "wss://video-process-app.up.railway.app/"
            );
            socket.addEventListener("open", () => {
                socket.send(
                    JSON.stringify({ type: "upload", fileName: fileName })
                );
            });
            socket.addEventListener("message", (event) => {
                const { status, msg } = JSON.parse(event.data);
                console.log(msg);
                switch (status) {
                    case "checked":
                        statusInit.classList.remove("progress");
                        statusInit.classList.add("active");
                        statusVideo.classList.add("progress");
                        firstLine.style.setProperty(
                            "--line-color-1",
                            "var(--status-active)"
                        );
                        status360.classList.add("progress");
                        status480.classList.add("progress");
                        status720.classList.add("progress");
                        transcodeLine1.style.setProperty(
                            "--line-color-1",
                            "var(--status-active)"
                        );
                        transcodeLine2.style.setProperty(
                            "--line-color-2",
                            "var(--status-active)"
                        );
                        transcodeLine3.style.setProperty(
                            "--line-color-3",
                            "var(--status-active)"
                        );
                        statusMain.textContent = msg;
                        break;
                    case "processed":
                        if (msg === "360p") {
                            status360.classList.remove("progress");
                            status360.classList.add("active");
                            statusMain.textContent = msg + " processed";
                        }
                        if (msg === "480p") {
                            status480.classList.remove("progress");
                            status480.classList.add("active");
                            statusMain.textContent = msg + " processed";
                        }
                        if (msg === "720p") {
                            status720.classList.remove("progress");
                            status720.classList.add("active");
                            statusMain.textContent = msg + " processed";
                        }
                        if (
                            status360.classList.contains("active") &&
                            status480.classList.contains("active") &&
                            status720.classList.contains("active")
                        ) {
                            statusVideo.classList.remove("progress");
                            statusVideo.classList.add("active");
                            secondLine.style.setProperty(
                                "--line-color-2",
                                "var(--status-active)"
                            );
                            statusDone.classList.add("progress");
                        }
                        break;
                    case "done":
                        statusDone.classList.remove("progress");
                        statusDone.classList.add("active");
                        //reset all classes
                        const activeElements =
                            document.querySelectorAll(".active");
                        activeElements.forEach((elem) =>
                            elem.classList.remove("active")
                        );
                        statusMain.textContent = "Video iframe URL";
                        break;
                    default:
                        statusMain.textContent = msg;
                        break;
                }
            });
        } else {
            statusMain.textContent = "Wrong file format";
        }
    };
    fileReader.readAsArrayBuffer(theFile);
});
