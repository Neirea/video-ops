const appTitle = document.querySelector(".app-title");
const tokenInput = document.querySelector(".token-input");
const fileNameInput = document.querySelector(".filename-input");
const btnUpload = document.querySelector(".btn-upload");
const fileContainer = document.querySelector(".file-container");
const fileSelected = document.querySelector(".file-selected");
const file = document.querySelector(".file");
const fileLabel = document.querySelector(".file-label");
const tokenElem = document.querySelector(".token");
const fileNameElem = document.querySelector(".filename");
const videosList = document.querySelector(".video-list");
const embeddedLink = document.querySelector(".embedded-link");
// message elements
const statusContainer = document.querySelector(".status-container");
const statusMain = document.querySelector(".status-main");
const statusError = document.querySelector(".status-error");
// transcoding elements
const statusInit = document.querySelector(".status-init");
const statusVideo = document.querySelector(".status-video");
const statusDone = document.querySelector(".status-done");
const status1 = document.querySelector(".status-1"); //first top line
const status2 = document.querySelector(".status-2"); //second top line
const status480 = document.querySelector(".status-480"); //480p line
const status720 = document.querySelector(".status-720"); //720p line
const status1080 = document.querySelector(".status-1080"); //1080p line
//video player
const videoDesc = document.querySelector(".video-desc");
const fullScreenBtn = document.querySelector(".full-screen-btn");
const openFullScreenElem = document.querySelector(".open");
const closeFullScreenElem = document.querySelector(".close");

let queryParams = new URLSearchParams(window.location.search);

// fetches list of videos
const videos = getVideoList();
let prevVideo; //used to continue playing video if only quality changes

//default parameters
setDefault();

// click on title -> go home page
appTitle.addEventListener("click", () => {
    window.location.href = "/";
});
// account for moving through history
window.addEventListener("popstate", async (e) => {
    queryParams = new URLSearchParams(window.location.search);
    const v = queryParams.get("v");
    const q = localStorage.getItem("vo-quality") || 1080;
    deleteImages();
    getThumbnails(v);
    embeddedLink.textContent = getIframeLink(v);
    if (!q) {
        videoDesc.textContent = await getVideoTitle(videos, v);
        video.src = `/video?v=${v}`;
    } else {
        videoPlayer.classList.add("paused");
        video.src = `/video?v=${v}&q=${q}`;
    }
});

// keyboard events
document.addEventListener("keydown", (e) => {
    const tagName = document.activeElement.tagName.toLowerCase();

    if (tagName === "input") return;

    switch (e.key.toLowerCase()) {
        case " ":
            if (tagName === "button") return;
        case "k":
            togglePlay();
            break;
        case "m":
            toggleMute();
            break;
        case "arrowleft":
        case "j":
            skip(-5);
            break;
        case "arrowright":
        case "l":
            skip(5);
            break;
    }
});
// duration
video.addEventListener("loadstart", () => {
    //remove progress from new video and make sure it's paused
    if (prevVideo !== queryParams.get("v")) {
        bufferedSegment.style.left = "0%";
        bufferedSegment.style.width = "0";
        timelineContainer.style.setProperty("--progress-position", 0);
        currentTime.textContent = formatDuration(video.currentTime);
        //preset playback speed text
        const savedPlaybackRate = localStorage.getItem("vo-speed");
        if (savedPlaybackRate) speedBtn.textContent = `${savedPlaybackRate}x`;
        //paused
        video.pause();
        videoPlayer.classList.add("paused");
        wasPaused = true;
    }
});
// adjust size of embedded link textarea
embeddedLink.addEventListener("click", () => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(embeddedLink);
    const stringRange = range.toString().trim();

    selection.removeAllRanges();
    if (selection.toString() != stringRange) {
        selection.addRange(range);
    }
});
embeddedLink.addEventListener("blur", () => {
    window.getSelection().removeAllRanges();
});
qualityList.addEventListener("click", (e) => {
    const quality = parseInt(e.target.textContent.split("p")[0]);
    localStorage.setItem("vo-quality", quality);
    qualityBtn.textContent = quality + "p";
    const videoParam = queryParams.get("v");
    wasPaused = video.paused;
    prevVideo = videoParam;
    video.src = `video?v=${videoParam}&q=${quality}`;
    qualityList.style.display = "none";
});
// full screen
fullScreenBtn.addEventListener("click", () => {
    // Exit full screen
    if (document.fullscreenElement == videoPlayer) {
        document.exitFullscreen();
        return;
    }
    /* IOS */
    if (document.webkitCurrentFullScreenElement == videoPlayer) {
        openFullScreenElem.style.display = "block";
        closeFullScreenElem.style.display = "none";
        document.webkitCancelFullScreen();
        return;
    }
    if (document.webkitFullscreenElement == videoPlayer) {
        openFullScreenElem.style.display = "block";
        closeFullScreenElem.style.display = "none";
        document.webkitExitFullscreen();
        return;
    }
    // Enter Full screen
    if (videoPlayer.requestFullscreen) {
        videoPlayer.requestFullscreen();
    } else if (videoPlayer.webkitRequestFullscreen) {
        /* IOS */
        openFullScreenElem.style.display = "none";
        closeFullScreenElem.style.display = "block";
        videoPlayer.webkitRequestFullscreen();
    } else if (videoPlayer.webkitEnterFullscreen) {
        openFullScreenElem.style.display = "none";
        closeFullScreenElem.style.display = "block";
        videoPlayer.webkitEnterFullscreen();
    } else if (videoPlayer.msRequestFullscreen) {
        /* IE11 */
        videoPlayer.msRequestFullscreen();
    }
});
// file input
file.addEventListener("change", (e) => {
    if (e.target.value) {
        btnUpload.disabled = false;
        fileSelected.textContent = e.target.value;
    } else {
        btnUpload.disabled = true;
        fileSelected.textContent = String.fromCharCode(160);
    }
});
//upload event
btnUpload.addEventListener("click", () => {
    const fileReader = new FileReader();
    const theFile = file.files[0];

    if (fileNameInput.value.length < 2) return;

    fileReader.onload = async (ev) => {
        const fileSize = ev.target.result.byteLength;
        //check if file is bigger than 2GB
        if (fileSize > 2 * 10 ** 9) return;
        let CHUNK_SIZE = 10 ** 7; //10Mb - min size for chunk
        const chunkCount = Math.ceil(fileSize / CHUNK_SIZE);

        const extension = theFile.name.split(".").pop().toLowerCase();
        //can't do more than 10000 chunks for s3
        const isSuccess = chunkCount <= 10000;
        const fileName = generateShortId() + `.${extension}`;

        if (isSuccess) {
            btnUpload.disabled = true;
            file.disabled = true;
            //initialize upload

            try {
                const uploadResult = await fetch("/create-upload", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        token: tokenInput.value,
                    },
                    body: JSON.stringify({
                        name: fileName,
                    }),
                });
                if (!uploadResult.ok) throw await uploadResult.json();
                const { UploadId, Key } = await uploadResult.json();

                //get urls for client to upload file chunks
                const uploadUrlsResult = await fetch("/get-upload-urls", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        token: tokenInput.value,
                    },
                    body: JSON.stringify({
                        UploadId,
                        Key,
                        parts: chunkCount,
                    }),
                });
                if (!uploadUrlsResult.ok) throw await uploadUrlsResult.json();
                const { parts } = await uploadUrlsResult.json();

                //result of s3 responses
                const chunksArray = [];
                const partRequests = [];

                for (let chunkId = 0; chunkId < chunkCount; chunkId++) {
                    const chunk = ev.target.result.slice(
                        chunkId * CHUNK_SIZE,
                        chunkId * CHUNK_SIZE + CHUNK_SIZE
                    );
                    chunksArray.push(chunk);
                }
                statusMain.textContent = "0%";

                const reqProgress = { total: fileSize };
                chunksArray.forEach((item, idx) => {
                    reqProgress[idx] = { loaded: 0 };
                    partRequests.push(
                        trackedRequest(
                            parts[idx].signedUrl,
                            "PUT",
                            item,
                            idx,
                            reqProgress,
                            statusMain
                        )
                    );
                });

                const partResetuls = await Promise.all(partRequests);
                const results = partResetuls.map(({ ETag, PartNumber }) => {
                    return {
                        ETag,
                        PartNumber,
                    };
                });
                //finish uploading
                statusMain.textContent = "Finalizing upload...";
                const completeResult = await fetch("/complete-upload", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        token: tokenInput.value,
                    },
                    body: JSON.stringify({
                        Key,
                        UploadId,
                        parts: results,
                    }),
                });
                if (!completeResult.ok) throw await completeResult.json();
                await completeResult.json();
            } catch (error) {
                resetUI(error);
                reqProgress = {};
                return;
            }

            //----------------------------------------------
            tokenElem.style.display = "none";
            fileNameElem.style.display = "none";
            btnUpload.style.display = "none";
            fileContainer.style.display = "none";
            statusContainer.classList.add("active");
            statusInit.classList.add("progress");
            statusMain.textContent = "Transcoding has started! Please wait...";
            //create websocket connection
            const socket = new WebSocket(
                "wss://video-process-app.up.railway.app/"
            );
            socket.addEventListener("open", () => {
                socket.send(
                    JSON.stringify({
                        type: "upload",
                        fileName: fileName,
                        dbName: fileNameInput.value,
                    })
                );
            });
            socket.addEventListener("message", (event) => {
                const { status, msg, name } = JSON.parse(event.data);
                switch (status) {
                    case "checked":
                        statusInit.classList.remove("progress");
                        statusInit.classList.add("active");
                        statusInit.textContent = "✔";
                        statusVideo.classList.add("progress");
                        status1.style.setProperty(
                            "--line-color-1",
                            "var(--status-active)"
                        );
                        status480.classList.add("progress");
                        status720.classList.add("progress");
                        status1080.classList.add("progress");
                        status480.style.setProperty(
                            "--line-color-1",
                            "var(--status-active)"
                        );
                        status720.style.setProperty(
                            "--line-color-2",
                            "var(--status-active)"
                        );
                        status1080.style.setProperty(
                            "--line-color-3",
                            "var(--status-active)"
                        );
                        statusMain.textContent = msg;
                        break;
                    case "processed":
                        if (msg === "480p") {
                            status480.classList.remove("progress");
                            status480.classList.add("active");
                            status480.textContent = "✔";
                            statusMain.textContent = msg + " processed";
                        }
                        if (msg === "720p") {
                            status720.classList.remove("progress");
                            status720.classList.add("active");
                            status720.textContent = "✔";
                            statusMain.textContent = msg + " processed";
                        }
                        if (msg === "1080p") {
                            status1080.classList.remove("progress");
                            status1080.classList.add("active");
                            status1080.textContent = "✔";
                            statusMain.textContent = msg + " processed";
                        }
                        if (
                            status480.classList.contains("active") &&
                            status720.classList.contains("active") &&
                            status1080.classList.contains("active")
                        ) {
                            statusVideo.classList.remove("progress");
                            statusVideo.classList.add("active");
                            statusVideo.textContent = "✔";
                            status2.style.setProperty(
                                "--line-color-2",
                                "var(--status-active)"
                            );
                            statusDone.classList.add("progress");
                        }
                        break;
                    case "done":
                        statusDone.classList.remove("progress");
                        statusDone.classList.add("active");
                        statusDone.textContent = "✔";
                        //RESET TO DEFAULT
                        resetUI();
                        statusMain.textContent = "Finished uploading";
                        // ADD LINK TO THE LIST OF VIDEOS
                        createVideoListElement(name, msg);
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

async function setDefault() {
    // default
    if (localStorage.getItem("vo-quality") == null) {
        localStorage.setItem("vo-quality", "1080");
    }
    if (localStorage.getItem("vo-speed") == null) {
        localStorage.setItem("vo-speed", 1);
    }
    if (!queryParams.get("v")) {
        queryParams.set("v", "default");
        history.replaceState(null, null, "?v=default");
    }
    const videoUrl = queryParams.get("v");
    const quality = localStorage.getItem("vo-quality");
    qualityBtn.textContent = quality + "p";
    const playbackRate = localStorage.getItem("vo-speed");
    speedBtn.textContent = `${playbackRate}x`;
    video.src = `/video?v=${videoUrl}&q=${quality}`;
    embeddedLink.textContent = getIframeLink(videoUrl);
    videoDesc.textContent = await getVideoTitle(videos, videoUrl);
    getThumbnails(videoUrl);
    // volume
    video.volume = localStorage.getItem("vo-volume") || 0.5;
}

async function getVideoList() {
    const result = await fetch("/videos").then((res) => res.json());
    result.videoNames.forEach((item) => {
        createVideoListElement(item.name, item.url);
    });
    return result.videoNames;
}
async function getVideoTitle(videos, urlName) {
    return (
        (await videos).find((item) => item.url === urlName).name ||
        "Unknown title"
    );
}
function skip(duration) {
    video.currentTime += duration;
}

function deleteImages() {
    if (!thumbnails.length) return;
    thumbnails.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    //empty array
    while (thumbnails.length > 0) {
        thumbnails.pop();
    }
}

function createVideoListElement(name, url) {
    const listElem = document.createElement("li");
    listElem.textContent = name;
    listElem.addEventListener("click", () => {
        prevVideo = queryParams.get("v");
        queryParams.set("v", url);
        const newUrl = "?" + queryParams.toString();
        // Use pushState to update the URL without reloading the page
        if (window.location.search !== newUrl) {
            history.pushState({ path: newUrl }, "", newUrl);
            videoDesc.textContent = name;
            const quality = localStorage.getItem("vo-quality") || 1080;
            deleteImages();
            getThumbnails(url);
            video.src = `/video?v=${url}&q=${quality}`;
            embeddedLink.textContent = getIframeLink(url);
        }
    });
    videosList.prepend(listElem);
}

function getIframeLink(url) {
    return ` <iframe src="${window.location.origin}/embed/${url}" frameborder="0" width="640" height="360"></iframe>`;
}

function trackedRequest(url, method, body, idx, reqProgress, htmlElem) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
            reqProgress[idx].loaded = e.loaded;
            const currentProgress = Object.keys(reqProgress).reduce(
                (prev, curr) => {
                    if (!isNaN(curr)) {
                        return prev + reqProgress[curr].loaded;
                    }
                    return prev;
                },
                0
            );
            htmlElem.textContent = `${Math.floor(
                (currentProgress / reqProgress.total) * 100
            )}%`;
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

function resetUI(error) {
    if (error) {
        statusMain.textContent = error.message;
    }
    //remove styles from lines
    status1.style.removeProperty("--line-color-1");
    status2.style.removeProperty("--line-color-2");
    status480.style.removeProperty("--line-color-1");
    status720.style.removeProperty("--line-color-2");
    status1080.style.removeProperty("--line-color-3");
    //display reset
    tokenElem.style.display = "flex";
    fileNameElem.style.display = "flex";
    btnUpload.style.display = "inline-block";
    fileContainer.style.display = "flex";
    //reset buttons and inputs
    btnUpload.disabled = false;
    file.disabled = false;
    fileSelected.value = undefined;
    fileSelected.textContent = String.fromCharCode(160);
    //reset all active classes
    const activeElements = document.querySelectorAll(".active");
    activeElements.forEach((elem) => elem.classList.remove("active"));
    //reset statuses
    statusInit.textContent = "?";
    statusVideo.textContent = "?";
    statusDone.textContent = "?";
    status480.textContent = "?";
    status720.textContent = "?";
    status1080.textContent = "?";
}

function generateShortId() {
    const uuid = crypto.randomUUID();
    const uuidBytes = new TextEncoder().encode(uuid.replace(/-/g, ""));
    const encoded = btoa(String.fromCharCode(...uuidBytes));
    return encoded.slice(0, 10);
}
