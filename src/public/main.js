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
    fileReader.onload = async (ev) => {
        const CHUNK_SIZE = 5242880; //5Mb
        const BATCH_SIZE = 15;
        const chunkCount = Math.ceil(ev.target.result.byteLength / CHUNK_SIZE);

        const fileTypes = ["mp4", "mkv", "avi", "mov"];
        const extension = theFile.name.split(".").pop().toLowerCase();
        //can't do more than 10000 chunks for s3
        const isSuccess =
            fileTypes.indexOf(extension) > -1 && chunkCount <= 10000;
        const fileName = crypto.randomUUID() + `.${extension}`;

        if (isSuccess) {
            //initialize upload
            const uploadResult = await fetch(
                "http://localhost:5000/create-upload",
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        name: fileName,
                    }),
                }
            );
            const { UploadId, Key } = await uploadResult.json();

            //get urls for client to upload file chunks
            const uploadUrlsResult = await fetch(
                "http://localhost:5000/get-upload-urls",
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        UploadId,
                        Key,
                        parts: chunkCount,
                    }),
                }
            );
            const { parts } = await uploadUrlsResult.json();

            //result of s3 responses
            const results = [];
            const chunksArray = [];

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
            for (let i = 0; i < chunksArray.length; i += BATCH_SIZE) {
                const batch = chunksArray.slice(i, i + BATCH_SIZE);
                const batchRequests = [];
                batch.forEach((item, idx) => {
                    batchRequests.push(
                        fetch(parts[idx].signedUrl, {
                            method: "PUT",
                            body: item,
                        })
                    );
                });
                results.push(...(await Promise.all(batchRequests)));
                //show progress of uploading
                divOutput.textContent =
                    Math.floor(
                        (batchRequests.length * 100) / chunksArray.length
                    ) + "%";
            }
            btnUpload.removeAttribute("disabled");

            const testParts = results.map((item, idx) => {
                return {
                    ETag: item.headers.get("ETag"),
                    PartNumber: idx + 1,
                };
            });

            //finish uploading
            const completeResult = await fetch(
                "http://localhost:5000/complete-upload",
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "file-id": UploadId,
                        "file-name": fileName,
                    },
                    body: JSON.stringify({
                        Key,
                        UploadId,
                        parts: testParts,
                    }),
                }
            );
            const result = await completeResult.json();
            console.log(result);
        } else {
            divOutput.textContent = "Wrong file format";
        }
    };
    fileReader.readAsArrayBuffer(theFile);
});
