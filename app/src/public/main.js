const btnUpload = document.getElementById("btn-upload");
const fileSelected = document.getElementById("file-selected");
const divOutput = document.getElementById("output");
const f = document.getElementById("file");

f.addEventListener("change", (e) => {
    if (e.target.value) {
        fileSelected.innerText = e.target.value;
    } else {
        fileSelected.innerHTML = "&nbsp;";
    }
});

btnUpload.addEventListener("click", () => {
    const fileReader = new FileReader();
    const theFile = f.files[0];
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
            divOutput.textContent = "0%";
            btnUpload.setAttribute("disabled", "");

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
            divOutput.textContent = "Loading...";
            btnUpload.removeAttribute("disabled");

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
            divOutput.textContent = "Complete!";
            //create websocket connection
            const socket = io("https://video-process-app.up.railway.app/");

            socket.emit("upload", fileName, (serverStatus) => {
                divOutput.textContent = serverStatus;
                console.log(serverStatus);
            });
            socket.on(fileName, (serverStatus) => {
                divOutput.textContent = serverStatus;
                console.log(serverStatus);
            });
        } else {
            divOutput.textContent = "Wrong file format";
        }
    };
    fileReader.readAsArrayBuffer(theFile);
});
