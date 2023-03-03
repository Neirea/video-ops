const videoSrc = video.dataset.url;

setDefault();

// duration
video.addEventListener("loadstart", () => {
    currentTime.textContent = formatDuration(video.currentTime);
    //preset playback speed text
    const savedPlaybackRate = localStorage.getItem("vo-speed");
    if (savedPlaybackRate) speedBtn.textContent = `${savedPlaybackRate}x`;
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
    if (localStorage.getItem("vo-speed") == null) {
        localStorage.setItem("vo-speed", 1);
    }
    const quality = localStorage.getItem("vo-quality");
    qualityBtn.textContent = quality + "p";
    const playbackRate = localStorage.getItem("vo-speed");
    speedBtn.textContent = `${playbackRate}x`;
    video.src = videoSrc + `&q=${quality}`;
    const videoUrl = videoSrc.split("?v=")[1];
    getThumbnails(videoUrl);
    // volume
    video.volume = localStorage.getItem("vo-volume") || 0.5;
}
