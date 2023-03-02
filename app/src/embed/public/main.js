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
const bufferedSegment = document.querySelector(".buffered-segment");
const previewImg = document.querySelector(".preview-img");
const thumbnailImg = document.querySelector(".thumbnail-img");
const qualityBtn = document.querySelector(".quality-btn");
const qualityList = document.querySelector(".quality-list");
const openFullScreenElem = document.querySelector(".open");
const closeFullScreenElem = document.querySelector(".close");
const videoTitle = document.querySelector(".video-title");

let thumbnails = [];
let isScrubbing = false;
let wasPaused;
const videoSrc = video.dataset.url;
const videoUrl = videoSrc.split("?v=")[1];

setDefault();
// loading state
video.addEventListener("waiting", () => {
    if (!video.seeking) loadingIndicator.style.display = "block";
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
    }%, var(--unfilled) 0%)`;
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
    localStorage.setItem("vo-volume", video.volume);
});
volumeSlider.addEventListener("input", (e) => {
    video.volume = e.target.value;
    video.muted = e.target.value === 0;
});
// duration
video.addEventListener("loadstart", () => {
    currentTime.textContent = formatDuration(video.currentTime);
    //preset playback speed text
    const savedPlaybackRate = localStorage.getItem("vo-speed");
    if (savedPlaybackRate) speedBtn.textContent = `${savedPlaybackRate}x`;
});
video.addEventListener("loadeddata", async () => {
    loadingIndicator.style.display = "none";
    totalTime.textContent = formatDuration(video.duration);
    video.playbackRate = localStorage.getItem("vo-speed") || 1;
    speedBtn.textContent = `${video.playbackRate}x`;
    const percent = timelineContainer.style.getPropertyValue(
        "--progress-position"
    );
    video.currentTime = percent * video.duration;
    if (wasPaused === false) await video.play();
});
// buffer timeline
// triggers on playback or "video.currentTime" change
video.addEventListener("timeupdate", (e) => {
    if (video.duration) {
        currentTime.textContent = formatDuration(video.currentTime);
        const percent = video.currentTime / video.duration;
        timelineContainer.style.setProperty("--progress-position", percent);
        updateBufferRange();
    }
});
// playback speed
speedBtn.addEventListener("click", () => {
    let newPlaybackRate = video.playbackRate + 0.25;
    if (newPlaybackRate > 2) newPlaybackRate = 0.25;
    video.playbackRate = newPlaybackRate;
    speedBtn.textContent = `${newPlaybackRate}x`;
    localStorage.setItem("vo-speed", newPlaybackRate);
});
// quality
qualityBtn.addEventListener("click", (e) => {
    if (qualityList.style.display === "block") {
        qualityList.style.display = "none";
    } else {
        qualityList.style.display = "block";
    }
});
document.addEventListener("click", (e) => {
    if (!(qualityList.contains(e.target) || e.target == qualityBtn)) {
        qualityList.style.display = "none";
    }
});
window.addEventListener("blur", () => {
    qualityList.style.display = "none";
});
qualityList.addEventListener("click", (e) => {
    const quality = parseInt(e.target.textContent.split("p")[0]);
    localStorage.setItem("vo-quality", quality);
    qualityBtn.textContent = quality + "p";
    wasPaused = video.paused;
    video.src = videoSrc + `&q=${quality}`;
    qualityList.style.display = "none";
});

async function setDefault() {
    // default
    if (localStorage.getItem("vo-quality") == null) {
        localStorage.setItem("vo-quality", "1080");
    }
    const quality = localStorage.getItem("vo-quality");
    qualityBtn.textContent = quality + "p";
    video.src = videoSrc + `&q=${quality}`;
    getThumbnails(videoUrl);
    // volume
    video.volume = localStorage.getItem("vo-volume") || 0.5;
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
// buffered range
function updateBufferRange() {
    const bufferRange = video.buffered;
    if (bufferRange.length === 0) {
        bufferedSegment.style.left = "0%";
        bufferedSegment.style.width = "100%";
        return;
    }
    // check current position of playback
    let bufferIndex = bufferRange.start(0);
    for (let i = 0; i < bufferRange.length; i++) {
        if (
            video.currentTime >= bufferRange.start(i) &&
            video.currentTime < bufferRange.end(i)
        ) {
            bufferIndex = i;
        }
    }
    const bufferedStart = bufferRange.start(bufferIndex);
    const bufferedEnd = bufferRange.end(bufferIndex);
    const bufferedWidth = `${
        ((bufferedEnd - bufferedStart) / video.duration) * 100
    }%`;

    bufferedSegment.style.left = `${(bufferedStart / video.duration) * 100}%`;
    bufferedSegment.style.width = bufferedWidth;
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
    const context = canvas.getContext("2d", {
        willReadFrequently: true,
    });
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
