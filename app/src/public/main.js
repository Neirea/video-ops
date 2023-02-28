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
const video = document.querySelector("video");
const videoDesc = document.querySelector(".video-desc");
const videoPlayer = document.querySelector(".video-player");
const loadingIndicator = document.querySelector(".loading-indicator");
const playPauseBtn = document.querySelector(".play-pause-btn");
const fullScreenBtn = document.querySelector(".full-screen-btn");
const muteBtn = document.querySelector(".mute-btn");
const volumeSlider = document.querySelector(".volume-slider");
const currentTime = document.querySelector(".current-time");
const totalTime = document.querySelector(".total-time");
const speedBtn = document.querySelector(".speed-btn");
const timelineContainer = document.querySelector(".timeline-container");
const previewImg = document.querySelector(".preview-img");
const thumbnailImg = document.querySelector(".thumbnail-img");
const qualityBtn = document.querySelector(".quality-btn");
const qualityList = document.querySelector(".quality-list");
const openFullScreenElem = document.querySelector(".open");
const closeFullScreenElem = document.querySelector(".close");

let queryParams = new URLSearchParams(window.location.search);

// fetches list of videos
const videos = getVideoList();
let thumbnails = []; //list of thumbnail preview images
let isScrubbing = false;
let wasPaused;
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
    const q = localStorage.getItem("quality") || 1080;
    deleteImages();
    getThumbnails(v);
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
// loading state
video.addEventListener("waiting", () => {
    loadingIndicator.style.display = "block";
});
video.addEventListener("playing", () => {
    loadingIndicator.style.display = "none";
});

// timeline
timelineContainer.addEventListener("mousemove", handleTimelineUpdate);
timelineContainer.addEventListener("mousedown", toggleScrubbing);
timelineContainer.addEventListener("touchstart", handleTouchStartScrubbing);
document.addEventListener("mouseup", (e) => {
    if (isScrubbing) toggleScrubbing(e);
});
document.addEventListener("mousemove", (e) => {
    if (isScrubbing) handleTimelineUpdate(e);
});
// play/pause video
playPauseBtn.addEventListener("click", togglePlay);
video.addEventListener("click", togglePlay);
video.addEventListener("play", () => {
    videoPlayer.classList.remove("paused");
});
video.addEventListener("pause", () => {
    videoPlayer.classList.add("paused");
});
// volume
muteBtn.addEventListener("click", toggleMute);
video.addEventListener("volumechange", () => {
    volumeSlider.value = video.volume;
    volumeSlider.style.background = `linear-gradient(90deg, white ${
        video.volume * 100
    }%, gray 0%)`;
    let volumeLevel;
    if (video.muted || video.volume === 0) {
        volumeSlider.value = 0;
        volumeLevel = "muted";
    } else if (video.volume >= 0.5) {
        volumeLevel = "high";
    } else {
        volumeLevel = "low";
    }
    videoPlayer.dataset.volumeLevel = volumeLevel;
    localStorage.setItem("volume", video.volume);
});
volumeSlider.addEventListener("input", (e) => {
    video.volume = e.target.value;
    video.muted = e.target.value === 0;
});
// duration
video.addEventListener("loadeddata", async () => {
    loadingIndicator.style.display = "none";
    totalTime.textContent = formatDuration(video.duration);
    video.playbackRate = localStorage.getItem("speed") || 1;
    speedBtn.textContent = `${video.playbackRate}x`;
    //remove progress from new video
    if (prevVideo !== queryParams.get("v")) {
        timelineContainer.style.removeProperty("--progress-position");
        currentTime.textContent = formatDuration(video.currentTime);
        return;
    }
    const percent = timelineContainer.style.getPropertyValue(
        "--progress-position"
    );
    video.currentTime = percent * video.duration;
    if (wasPaused === false) await video.play();
});
video.addEventListener("timeupdate", () => {
    if (video.duration) {
        currentTime.textContent = formatDuration(video.currentTime);
        const percent = video.currentTime / video.duration;
        timelineContainer.style.setProperty("--progress-position", percent);
    }
});
// playback speed
speedBtn.addEventListener("click", () => {
    let newPlaybackRate = video.playbackRate + 0.25;
    if (newPlaybackRate > 2) newPlaybackRate = 0.25;
    video.playbackRate = newPlaybackRate;
    speedBtn.textContent = `${newPlaybackRate}x`;
    localStorage.setItem("speed", newPlaybackRate);
});
// quality
qualityBtn.addEventListener("click", (e) => {
    if (qualityList.style.display === "block") {
        qualityList.style.display = "none";
    } else {
        qualityList.style.display = "block";
    }
});
qualityList.addEventListener("click", (e) => {
    const quality = parseInt(e.target.textContent);
    localStorage.setItem("quality", quality);
    qualityBtn.textContent = quality + "p";
    const videoParam = queryParams.get("v");
    const videoSrc = `video?v=${videoParam}&q=${quality}`;
    wasPaused = video.paused;
    prevVideo = videoParam;
    video.src = videoSrc;
    qualityList.style.display = "none";
});
// full screen
fullScreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement == videoPlayer) {
        document.exitFullscreen();
        return;
    }
    if (document.webkitCurrentFullScreenElement == videoPlayer) {
        openFullScreenElem.style.display = "block";
        closeFullScreenElem.style.display = "none";
        return;
    }
    if (videoPlayer.requestFullscreen) {
        videoPlayer.requestFullscreen();
    } else if (videoPlayer.webkitRequestFullscreen) {
        /* Safari */
        openFullScreenElem.style.display = "none";
        closeFullScreenElem.style.display = "block";
        videoPlayer.webkitRequestFullscreen();
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
    if (localStorage.getItem("quality") == null) {
        localStorage.setItem("quality", "1080");
    }
    if (!queryParams.get("v")) {
        queryParams.set("v", "default");
        history.replaceState(null, null, "?v=default");
    }
    const videoUrl = queryParams.get("v");
    const quality = localStorage.getItem("quality");
    qualityBtn.textContent = quality + "p";
    video.src = `/video?v=${videoUrl}&q=${quality}`;
    videoDesc.textContent = await getVideoTitle(videos, videoUrl);
    getThumbnails(videoUrl);
    // volume
    video.volume = localStorage.getItem("volume") || 0.5;
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
        "Default video"
    );
}

//timeline
async function toggleScrubbing(e) {
    const rect = timelineContainer.getBoundingClientRect();
    const percent =
        Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
    isScrubbing = (e.buttons & 1) === 1;
    videoPlayer.classList.toggle("scrubbing", isScrubbing);
    if (isScrubbing) {
        wasPaused = video.paused;
        video.pause();
    } else {
        video.currentTime = percent * video.duration;
        if (!wasPaused) await video.play();
    }

    handleTimelineUpdate(e);
}
async function handleTouchStartScrubbing(e) {
    if (e.targetTouches.length > 1) return;
    const rect = timelineContainer.getBoundingClientRect();
    let percent =
        Math.min(Math.max(0, e.targetTouches[0].pageX - rect.x), rect.width) /
        rect.width;
    videoPlayer.classList.add("scrubbing");
    isScrubbing = true;

    document.ontouchmove = function (e) {
        percent =
            Math.min(
                Math.max(0, e.targetTouches[0].pageX - rect.x),
                rect.width
            ) / rect.width;
        wasPaused = video.paused;
        video.pause();

        handleTimelineUpdate(e);
    };

    document.ontouchend = document.ontouchcancel = async function () {
        video.currentTime = percent * video.duration;
        if (!wasPaused) await video.play();
        videoPlayer.classList.remove("scrubbing");
        isScrubbing = false;
    };
}
function handleTimelineUpdate(e) {
    const x = e.x || e.targetTouches[0].pageX;
    const rect = timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, x - rect.x), rect.width) / rect.width;
    //thumbnail image
    const previewImgSrc = thumbnails[Math.floor(percent * 100)];
    if (previewImgSrc) previewImg.src = previewImgSrc;
    const previewX =
        x + previewImg.offsetWidth / 2 > rect.right
            ? rect.right - previewImg.offsetWidth / 2
            : x - previewImg.offsetWidth / 2 < rect.left
            ? rect.left + previewImg.offsetWidth / 2
            : x;
    const previewPercent =
        Math.min(Math.max(0, previewX - rect.x), rect.width) / rect.width;
    timelineContainer.style.setProperty("--preview-position", previewPercent);

    if (isScrubbing) {
        if (e.x) e.preventDefault();
        if (previewImgSrc) thumbnailImg.src = previewImgSrc;
        timelineContainer.style.setProperty("--progress-position", percent);
    }
}

async function togglePlay() {
    video.paused ? await video.play() : video.pause();
}

function toggleMute() {
    video.muted = !video.muted;
}

const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
});
function formatDuration(time) {
    const seconds = Math.floor(time % 60);
    const minutes = Math.floor(time / 60) % 60;
    const hours = Math.floor(time / 3600);
    if (hours === 0) {
        return `${minutes}:${leadingZeroFormatter.format(seconds)}`;
    } else {
        return `${hours}:${leadingZeroFormatter.format(
            minutes
        )}:${leadingZeroFormatter.format(seconds)}`;
    }
}
function skip(duration) {
    video.currentTime += duration;
}

function createVideoListElement(name, url) {
    const listElem = document.createElement("li");
    listElem.textContent = name;
    listElem.addEventListener("click", () => {
        queryParams.set("v", url);
        const newUrl = "?" + queryParams.toString();
        // Use pushState to update the URL without reloading the page
        if (window.location.search !== queryParams.toString()) {
            history.pushState({ path: newUrl }, "", newUrl);
            videoDesc.textContent = name;
            videoPlayer.classList.add("paused");
            const quality = localStorage.getItem("quality") || 1080;
            deleteImages();
            getThumbnails(url);
            video.src = `/video?v=${url}&q=${quality}`;
        }
    });
    videosList.prepend(listElem);
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
function getThumbnails(imgName) {
    fetch(`/image?img=${imgName}`)
        .then((res) => res.blob())
        .then((blob) => URL.createObjectURL(blob))
        .then((thumbnailCollage) => {
            //get images for preview
            deriveImages(thumbnailCollage).then((res) => {
                thumbnails = res;
            });
        });
}

function deriveImages(source) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const thumbnailCollage = new Image();
    thumbnailCollage.src = source;

    function getCanvasBlobUrl(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                resolve(url);
            });
        });
    }
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
                tmoContext.putImageData(thumbnail, 0, 0);
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

function deleteImages() {
    if (!thumbnails) return;
    thumbnails.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    //empty array
    while (thumbnails.length > 0) {
        thumbnails.pop();
    }
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
