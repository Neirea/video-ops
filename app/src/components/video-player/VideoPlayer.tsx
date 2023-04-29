import {
    ChangeEvent,
    SyntheticEvent,
    MouseEvent,
    TouchEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import VolumeHighIcon from "../icons/VolumeHighIcon";
import VolumeLowIcon from "../icons/VolumeLowIcon";
import VolumeMutedIcon from "../icons/VolumeMutedIcon";
import VideoPausedIcon from "../icons/VideoPausedIcon";
import VideoPlayIcon from "../icons/VideoPlayIcon";
import ControlButton from "./ControlButton";
import VideoFullClose from "../icons/VideoFullClose";
import VideoFullOpen from "../icons/VideoFullOpen";
import formatDuration from "@/utils/formatDuration";
import getThumbnails from "@/utils/getThumbnails";

//type support for different browsers
declare global {
    interface Document {
        webkitCurrentFullScreenElement: any;
        webkitCancelFullScreen: () => void;
        webkitFullscreenElement: any;
        webkitExitFullscreen: () => void;
    }
    interface HTMLElement {
        webkitRequestFullscreen: () => void;
        webkitEnterFullscreen: () => void;
        msRequestFullscreen: () => void;
    }
}

const VideoPlayer = () => {
    const [loading, setLoading] = useState(false);
    const [paused, setPaused] = useState(true);
    const [time, setTime] = useState("0:00");
    const [volumeLevel, setVolumeLevel] = useState("high");
    const [speed, setSpeed] = useState(1);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const isScrubbingRef = useRef(false);
    const previewImgRef = useRef<HTMLImageElement>(null);
    const thumbnailImgRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const bufferedRef = useRef<HTMLDivElement>(null);
    const volumeSliderRef = useRef<HTMLInputElement>(null);
    const qualityRef = useRef<HTMLElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const wasPaused = useRef<boolean | undefined>(undefined);
    const thumbnails = useRef<string[]>([]);

    //add (qualityList)
    useOutsideClick([qualityRef], () => {});

    useEffect(() => {
        if (!videoRef.current) return;
        getThumbnails("/test.jpg").then((r) => {
            thumbnails.current = r;
        });
        // add (default)
        videoRef.current.volume =
            Number(localStorage.getItem("vo-volume")) ?? 0.5;

        const handleMouseUp = (e: any) => {
            if (isScrubbingRef.current) toggleScrubbing(e);
        };
        const handleMove = (e: any) => {
            if (isScrubbingRef.current) handleTimelineUpdate(e);
        };
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousemove", handleMove);

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMove);
        };
    }, []);

    // dirty solution to deal with event document event listeners
    function updateIsScrubbing(value: boolean) {
        setIsScrubbing(value);
        isScrubbingRef.current = value;
    }

    async function handleLoadedData() {
        const video = videoRef.current;
        const timelineContainer = timelineRef.current;
        if (!video) return;
        if (!timelineContainer) return;
        video.playbackRate = Number(localStorage.getItem("vo-speed")) ?? 1;
        setLoading(false);
        setSpeed(video.playbackRate);
        const percent = timelineContainer.style.getPropertyValue(
            "--progress-position"
        );
        video.currentTime = Number(percent) * video.duration;
        if (wasPaused.current === false) await playVideo();
    }
    function handleTimeUpdate() {
        const video = videoRef.current;
        const timelineContainer = timelineRef.current;
        if (!video) return;
        if (!timelineContainer) return;
        if (isNaN(video.duration)) return;
        setTime(formatDuration(video.currentTime));
        const percent = video.currentTime / video.duration;

        timelineContainer.style.setProperty(
            "--progress-position",
            percent.toString()
        );

        updateBufferRange();
    }
    // buffered range
    function updateBufferRange() {
        const video = videoRef.current;
        if (!video) return;
        const bufferRange = video.buffered;
        const bufferedSegment = bufferedRef.current;
        if (!bufferedSegment) return;
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

        bufferedSegment.style.left = `${
            (bufferedStart / video.duration) * 100
        }%`;
        bufferedSegment.style.width = bufferedWidth;
    }

    function handleTimelineUpdate(
        e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>
    ) {
        const timelineContainer = timelineRef.current;
        const previewImg = previewImgRef.current;
        const thumbnailImg = thumbnailImgRef.current;

        if (!timelineContainer) return;
        if (!previewImg) return;
        if (!thumbnailImg) return;
        if (!thumbnails) return;

        let x = 0;
        if ("touches" in e) {
            x = e.targetTouches[0].pageX;
        } else if ("pageX" in e) {
            x = e.pageX;
        }

        const scrubbing = isScrubbingRef.current;

        const rect = timelineContainer.getBoundingClientRect();

        const percent =
            Math.min(Math.max(0, x - rect.x), rect.width) / rect.width;

        //thumbnail image
        if (thumbnails) {
            const previewImgSrc = thumbnails.current[Math.floor(percent * 100)];
            if (previewImgSrc) {
                previewImgRef.current.src = previewImgSrc;
                if (scrubbing) {
                    thumbnailImgRef.current.src = previewImgSrc;
                }
            }
        }

        const previewX =
            x + previewImg.offsetWidth / 2 > rect.right
                ? rect.right - previewImg.offsetWidth / 2
                : x - previewImg.offsetWidth / 2 < rect.left
                ? rect.left + previewImg.offsetWidth / 2
                : x;
        const previewPercent =
            Math.min(Math.max(0, previewX - rect.x), rect.width) / rect.width;

        timelineContainer.style.setProperty(
            "--preview-position",
            previewPercent.toString()
        );

        if (scrubbing) {
            if (x) e.preventDefault();
            timelineContainer.style.setProperty(
                "--progress-position",
                percent.toString()
            );
        }
    }

    async function toggleScrubbing(e: MouseEvent<HTMLDivElement>) {
        const video = videoRef.current;
        const timelineContainer = timelineRef.current;
        if (!video) return;
        if (!timelineContainer) return;
        if (isNaN(video.duration)) return;
        const rect = timelineContainer.getBoundingClientRect();

        const percent =
            Math.min(Math.max(0, e.pageX - rect.x), rect.width) / rect.width;

        const scrubbing = (e.buttons & 1) === 1;
        updateIsScrubbing(scrubbing);

        if (scrubbing) {
            wasPaused.current = video.paused;
            pauseVideo();
        } else {
            video.currentTime = percent * video.duration;
            if (wasPaused.current === false) await playVideo();
        }

        handleTimelineUpdate(e);
    }

    async function handleTouchStartScrubbing(e: TouchEvent<HTMLDivElement>) {
        const video = videoRef.current;
        const timelineContainer = timelineRef.current;
        if (!video) return;
        if (!timelineContainer) return;
        if (e.targetTouches.length > 1) return;
        if (isNaN(video.duration)) return;
        const rect = timelineContainer.getBoundingClientRect();
        let percent =
            Math.min(
                Math.max(0, e.targetTouches[0].pageX - rect.x),
                rect.width
            ) / rect.width;
        updateIsScrubbing(true);

        document.ontouchmove = function () {
            percent =
                Math.min(
                    Math.max(0, e.targetTouches[0].pageX - rect.x),
                    rect.width
                ) / rect.width;

            wasPaused.current = video.paused;
            pauseVideo();
            handleTimelineUpdate(e);
        };

        document.ontouchend = document.ontouchcancel = async function () {
            video.currentTime = percent * video.duration;
            if (wasPaused.current === false) await playVideo();

            updateIsScrubbing(false);

            //remove event listeners
            document.ontouchend =
                document.ontouchcancel =
                document.ontouchmove =
                    null;
        };
    }

    async function handleClick() {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (isNaN(video.duration)) return;
        video.paused ? await playVideo() : pauseVideo();
    }

    function handleSliderInput(e: ChangeEvent<HTMLInputElement>) {
        if (!videoRef.current) return;
        const value = +e.target.value;
        videoRef.current.volume = value;
        videoRef.current.muted = value === 0;
    }
    function handleMute() {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
    }

    function handleFullScreen() {
        const videoPlayer = document.getElementById("video-player");
        if (!videoPlayer) return;

        setIsFullScreen(false);
        // Exit full screen
        if (document.fullscreenElement == videoPlayer) {
            document.exitFullscreen();
            return;
        }
        /* IOS */
        if (document.webkitCurrentFullScreenElement == videoPlayer) {
            document.webkitCancelFullScreen();
            return;
        }
        if (document.webkitFullscreenElement == videoPlayer) {
            document.webkitExitFullscreen();
            return;
        }
        // Enter Full screen
        setIsFullScreen(true);
        if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen();
        } else if (videoPlayer.webkitRequestFullscreen) {
            /* IOS */
            videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.webkitEnterFullscreen) {
            videoPlayer.webkitEnterFullscreen();
        } else if (videoPlayer.msRequestFullscreen) {
            /* IE11 */
            videoPlayer.msRequestFullscreen();
        }
    }

    function handleVolumeChange(e: SyntheticEvent<HTMLVideoElement>) {
        const video = e.currentTarget;
        if (!volumeSliderRef?.current) return;
        volumeSliderRef.current.value = video.volume.toString();
        volumeSliderRef.current.style.background = `linear-gradient(90deg, white ${
            video.volume * 100
        }%, rgb(120 113 108 / 0.5) 0%)`;

        if (video.muted || video.volume === 0) {
            volumeSliderRef.current.value = "0";
            setVolumeLevel("muted");
        } else if (video.volume >= 0.5) {
            setVolumeLevel("high");
        } else {
            setVolumeLevel("low");
        }
        localStorage.setItem("vo-volume", volumeSliderRef.current.value);
    }

    function handleSpeed() {
        const video = videoRef.current;
        if (!video) return;
        let newPlaybackRate = video.playbackRate + 0.25;
        if (newPlaybackRate > 2) newPlaybackRate = 0.25;
        video.playbackRate = newPlaybackRate;
        setSpeed(newPlaybackRate);
        localStorage.setItem("vo-speed", newPlaybackRate.toString());
    }

    async function playVideo() {
        try {
            await videoRef.current?.play();
            setPaused(false);
        } catch (error) {}
    }

    function pauseVideo() {
        videoRef.current?.pause();
        setPaused(true);
    }

    return (
        <div className="grow p-4 pb-0">
            <div
                id={"video-player"}
                className="relative w-full flex bg-none group/video"
            >
                <video
                    ref={videoRef}
                    src="/test1.mp4"
                    className="w-full aspect-video"
                    onLoadedData={handleLoadedData}
                    onTimeUpdate={handleTimeUpdate}
                    onWaiting={() => {
                        if (videoRef.current && !videoRef.current.seeking)
                            setLoading(true);
                    }}
                    onPlaying={() => setLoading(false)}
                    onClick={handleClick}
                    onVolumeChange={handleVolumeChange}
                ></video>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                        className={`${
                            loading ? "block" : "hidden"
                        }  animate-spin w-12 h-12 border-4 border-solid border-b-transparent rounded-full`}
                    ></div>
                </div>
                <img
                    ref={thumbnailImgRef}
                    className={`${
                        isScrubbing ? "block" : "hidden"
                    } absolute top-0 left-0 right-0 bottom-0 w-full h-full brightness-50`}
                ></img>
                {/* .video-controls-container */}
                <div
                    className={`absolute left-0 right-0 bottom-0 text-white z-50 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity before:content-[''] before:absolute before:w-full before:z-[-1] before:pointer-events-none before:bottom-0 before:aspect-[6/1] before:bg-gradient-to-t from-black/75 to-transparent group-hover/video:opacity-100 group-focus-within/video:opacity-100 ${
                        videoRef.current?.paused ? "opacity-100" : ""
                    }`}
                >
                    {/* .timeline-container */}
                    <div
                        ref={timelineRef}
                        className="group/timeline h-4 ms-2 me-2 cursor-pointer flex items-end"
                        onMouseMove={handleTimelineUpdate}
                        onMouseDown={toggleScrubbing}
                        onTouchStart={handleTouchStartScrubbing}
                    >
                        {/* .timeline */}
                        <div
                            className={`timeline group-hover/timeline:h-[35%] relative bg-stone-500/50 h-[3px] w-full before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:bg-neutral-400 group-hover/timeline:before:block ${
                                isScrubbing ? "before:block" : "before:hidden"
                            } after:content-[''] after:absolute after:left-0 after:top-0 after:bottom-0 after:bg-violet-700 after:z-[1]`}
                        >
                            <img
                                ref={previewImgRef}
                                className={`preview-img ${
                                    isScrubbing ? "block" : "hidden"
                                } group-hover/timeline:block absolute h-20 aspect-video top-[-1rem] -translate-x-1/2 -translate-y-full border-2 border-solid rounded border-white`}
                            />
                            <div
                                className={`thumb-indicator group-hover/timeline:scale-100 absolute -translate-x-1/2 scale-0 h-[200%] -top-1/2 bg-purple-500 rounded-full transition-transform aspect-[1/1] z-[2]`}
                            ></div>
                            <div
                                ref={bufferedRef}
                                className="absolute top-0 bottom-0 h-full bg-white opacity-50"
                            ></div>
                        </div>
                    </div>
                    {/* .controls */}
                    <div className="flex gap-2 p-1 items-center">
                        {/* playPauseBtn */}
                        <ControlButton onClick={handleClick}>
                            {!paused ? <VideoPausedIcon /> : <VideoPlayIcon />}
                        </ControlButton>
                        <div className="flex items-center hover:flex group/vol">
                            <ControlButton onClick={handleMute}>
                                {/* add */}
                                {volumeLevel === "high" ? (
                                    <VolumeHighIcon />
                                ) : volumeLevel === "low" ? (
                                    <VolumeLowIcon />
                                ) : (
                                    <VolumeMutedIcon />
                                )}
                            </ControlButton>
                            {/* .volume-slider */}
                            <input
                                ref={volumeSliderRef}
                                type="range"
                                min="0"
                                max="1"
                                step="any"
                                className="volume-slider w-[1px] h-[0.3rem] origin-left scale-x-0 transition-all appearance-none cursor-pointer outline-none rounded-2xl bg-gradient-to-r from-white to-stone-500/50 focus-within:w-24 focus-within:scale-x-100 group-hover/vol:w-24 group-hover/vol:scale-x-100"
                                onChange={handleSliderInput}
                            ></input>
                        </div>
                        <div className="flex items-center gap-1 flex-grow">
                            <div>{time}</div>/
                            <div>
                                {videoRef.current
                                    ? formatDuration(videoRef.current.duration)
                                    : "0:00"}
                            </div>
                        </div>
                        <ControlButton
                            className="w-12 text-lg"
                            title="Playback speed"
                            onClick={handleSpeed}
                        >
                            {speed}x
                        </ControlButton>
                        {/* list of video qualities */}
                        <div className="relative min-w-[4rem]"></div>
                        {/* add 50% opacity to icon if embed */}
                        <ControlButton onClick={handleFullScreen}>
                            {isFullScreen ? (
                                <VideoFullClose />
                            ) : (
                                <VideoFullOpen />
                            )}
                        </ControlButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
