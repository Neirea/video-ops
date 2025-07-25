"use client";
import useDelayedValue from "@/hooks/useDelayedValue";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import useThumbnails from "@/hooks/useThumbnails";
import type { VideoType } from "@/models/Video";
import formatDuration from "@/utils/formatDuration";
import { throttle } from "@/utils/throttle";
import toNumber from "@/utils/toNumber";
import Image from "next/image";
import {
    type ChangeEvent,
    type MouseEvent,
    type SyntheticEvent,
    type TouchEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import ListItem from "../ListItem";
import VideoFullClose from "../icons/VideoFullClose";
import VideoFullOpen from "../icons/VideoFullOpen";
import VideoPausedIcon from "../icons/VideoPausedIcon";
import VideoPlayIcon from "../icons/VideoPlayIcon";
import VolumeHighIcon from "../icons/VolumeHighIcon";
import VolumeLowIcon from "../icons/VolumeLowIcon";
import VolumeMutedIcon from "../icons/VolumeMutedIcon";
import ControlButton from "./ControlButton";

//type support for different browsers
declare global {
    interface Document {
        webkitCurrentFullScreenElement: HTMLElement;
        webkitCancelFullScreen: () => void;
        webkitFullscreenElement: HTMLElement;
        webkitExitFullscreen: () => void;
    }
    interface HTMLElement {
        webkitRequestFullscreen: () => void;
        webkitEnterFullscreen: () => void;
        msRequestFullscreen: () => void;
    }
}

const throttleDelay = 25;
function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

const VideoPlayer = ({
    type,
    video,
    imageUrl,
}: {
    type: "normal" | "embed";
    video: VideoType;
    imageUrl: string;
}) => {
    const [popup, setPopup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paused, setPaused] = useState(true);
    const [wasPaused, setWasPaused] = useState<boolean>();
    const [time, setTime] = useState("0:00");
    const [volumeLevel, setVolumeLevel] = useState("high");
    const [speed, setSpeed] = useState(1);
    const [quality, setQuality] = useState<number>();
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const delayedScrubbing = useDelayedValue(isScrubbing);
    const thumbnails = useThumbnails(imageUrl);
    const previewImgRef = useRef<HTMLImageElement>(null);
    const thumbnailImgRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const bufferedRef = useRef<HTMLDivElement>(null);
    const volumeSliderRef = useRef<HTMLInputElement>(null);
    const qualityRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const qualityList = [480, 720, 1080];

    const togglePlay = useCallback(async () => {
        if (!videoRef.current?.duration) return;
        if (videoRef.current.paused) {
            await playVideo();
        } else {
            pauseVideo();
        }
    }, []);
    // update timeline
    const handleTimelineUpdate = useCallback(
        (
            e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>,
            scrubbing: boolean,
        ) => {
            const previewImg = previewImgRef.current;
            const thumbnailImg = thumbnailImgRef.current;
            const timelineContainer = timelineRef.current;
            if (!timelineContainer) return;
            if (!previewImg) return;
            if (!thumbnailImg) return;

            let x = 0;
            if ("touches" in e) {
                x = e.changedTouches[0].pageX;
            } else if ("pageX" in e) {
                e.preventDefault();
                x = e.pageX;
            }
            const rect = timelineContainer.getBoundingClientRect();
            const percent =
                Math.min(Math.max(0, x - rect.x), rect.width) / rect.width;

            //thumbnail image
            const previewImgSrc = thumbnails[Math.floor(percent * 100)];
            if (previewImgSrc && previewImg) {
                previewImg.src = previewImgSrc;
                if (scrubbing && thumbnailImg) {
                    thumbnailImg.src = previewImgSrc;
                }
            }
            const previewX =
                x + previewImg.offsetWidth / 2 > rect.right
                    ? rect.right - previewImg.offsetWidth / 2
                    : x - previewImg.offsetWidth / 2 < rect.left
                      ? rect.left + previewImg.offsetWidth / 2
                      : x;
            const previewPercent =
                Math.min(Math.max(0, previewX - rect.x), rect.width) /
                rect.width;
            timelineContainer.style.setProperty(
                "--preview-position",
                previewPercent.toString(),
            );
            if (scrubbing) {
                timelineContainer.style.setProperty(
                    "--progress-position",
                    percent.toString(),
                );
            }
        },
        [thumbnails],
    );
    // scrubbing via mouse and touch
    const toggleScrubbing = useCallback(
        async (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
            const video = videoRef.current;
            const timelineContainer = timelineRef.current;
            //don't do anything for mouseDown when touchDevice is active
            if (!timelineContainer) return;
            if (!video?.duration) return;
            if (loading) return;

            let scrubbing = false;
            let coordX = 0;
            if ("touches" in e) {
                // touch
                coordX = e.changedTouches[0].pageX;
                // targetTouches to determine active touches
                scrubbing = (e.targetTouches.length & 1) === 1;
            } else if ("pageX" in e) {
                // mouse
                coordX = e.pageX;
                scrubbing = (e.buttons & 1) === 1;
            }
            setIsScrubbing(scrubbing);
            handleTimelineUpdate(e, scrubbing);
            if (!scrubbing) {
                const rect = timelineContainer.getBoundingClientRect();
                const percent =
                    Math.min(Math.max(0, coordX - rect.x), rect.width) /
                    rect.width;
                video.currentTime = percent * video.duration;
                if (wasPaused === false) await playVideo();
                return;
            }
            pauseVideo();
        },
        [handleTimelineUpdate, loading, wasPaused],
    );

    useOutsideClick([qualityRef], () => {
        setPopup(false);
    });

    useEffect(() => {
        // start video loading with this quality
        setQuality(toNumber(localStorage.getItem("vo-quality")) || 1080);
        if (type !== "normal") return;

        const controller = new AbortController();
        const keyboardHandler = (e: KeyboardEvent) => {
            const tagName = document.activeElement?.tagName.toLowerCase();

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
        };
        document.addEventListener("keydown", keyboardHandler, {
            signal: controller.signal,
        });
        return () => {
            controller.abort();
        };
    }, [type, togglePlay]);

    useEffect(() => {
        if (!isScrubbing) return;
        // event listeners to track timeline scrubbing
        const handleEnd = (e: unknown) => {
            toggleScrubbing(
                e as MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>,
            );
        };
        const handleMove = throttle((e) => {
            handleTimelineUpdate(e, isScrubbing);
        }, throttleDelay);

        const controller = new AbortController();

        document.addEventListener("touchmove", handleMove, {
            signal: controller.signal,
        });
        document.addEventListener("touchend", handleEnd, {
            signal: controller.signal,
        });
        document.addEventListener("mousemove", handleMove, {
            signal: controller.signal,
        });
        document.addEventListener("mouseup", handleEnd, {
            signal: controller.signal,
        });
        return () => {
            controller.abort();
        };
    }, [isScrubbing, handleTimelineUpdate, toggleScrubbing]);

    const handleMouseOverMove = throttle((e) => {
        if (!isScrubbing) handleTimelineUpdate(e, isScrubbing);
    }, throttleDelay);

    // video load start
    function handleLoadStart() {
        const video = videoRef.current;
        if (!video) return;
        const vol = toNumber(localStorage.getItem("vo-volume"));
        const spd = toNumber(localStorage.getItem("vo-speed"));
        video.volume = vol >= 0 && vol <= 1 ? vol : 0.5; // values: 0..1
        video.playbackRate = spd > 0 && spd <= 2 && spd % 0.25 === 0 ? spd : 1; // values: 0.25..2 with 0.25 increment
        video.muted = toNumber(localStorage.getItem("vo-muted")) === 1; // values: 0 or 1
        setLoading(true);
        setTime(formatDuration(video.currentTime));
        setSpeed(video.playbackRate);
    }
    // intial setup on video data loaded
    async function handleLoadedData() {
        const video = videoRef.current;
        const timelineContainer = timelineRef.current;
        if (!video) return;
        if (!timelineContainer) return;
        setLoading(false);
        const percent =
            toNumber(
                timelineContainer.style.getPropertyValue("--progress-position"),
            ) || 0;
        video.currentTime = percent * video.duration;
        if (wasPaused === false) await playVideo();
    }
    // update displayed time
    function handleTimeUpdate() {
        const video = videoRef.current;
        const timelineContainer = timelineRef.current;
        if (!timelineContainer) return;
        if (!video?.duration) return;
        if (loading) return;
        setTime(formatDuration(video.currentTime));
        const percent = video.currentTime / video.duration;
        timelineContainer.style.setProperty(
            "--progress-position",
            percent.toString(),
        );
        updateBufferRange();
    }

    /* EVENT HANDLERS */
    async function handleVideoClick() {
        const video = videoRef.current;
        if (!video?.duration) return;
        if (loading) return;
        if (video.paused) {
            await playVideo();
        } else {
            pauseVideo();
        }
    }
    // volume
    function handleSliderInput(e: ChangeEvent<HTMLInputElement>) {
        const video = videoRef.current;
        if (!video) return;
        const value = +e.target.value;
        video.volume = value;
        video.muted = value === 0;
    }
    function handleMute() {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
    }
    function handleVolumeChange(e: SyntheticEvent<HTMLVideoElement>) {
        const video = e.currentTarget;
        if (!volumeSliderRef?.current) return;
        volumeSliderRef.current.value = video.volume.toString();
        localStorage.setItem("vo-volume", volumeSliderRef.current.value);
        localStorage.setItem("vo-muted", video.muted ? "1" : "0");
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
    }
    // full screen button
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
    // playback speed Button
    function handleSpeed() {
        const video = videoRef.current;
        if (!video) return;
        let newPlaybackRate = video.playbackRate + 0.25;
        if (newPlaybackRate > 2) newPlaybackRate = 0.25;
        video.playbackRate = newPlaybackRate;
        setSpeed(newPlaybackRate);
        localStorage.setItem("vo-speed", newPlaybackRate.toString());
    }
    // quality select one of the list items
    function handleQualitySelect(i: number) {
        localStorage.setItem("vo-quality", i.toString());
        pauseVideo();
        setQuality(i);
        setPopup(false);
    }
    /* UTILITY FUNCTIONS */
    async function playVideo() {
        try {
            if (videoRef.current?.paused) {
                await videoRef.current?.play();
                setPaused(false);
            }
        } catch (error) {
            console.error(error);
        }
    }
    function pauseVideo() {
        if (!videoRef.current?.duration) return;
        setWasPaused(videoRef.current.paused);
        setPaused(true);
        videoRef.current.pause();
    }
    function toggleMute() {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
    }
    function skip(duration: number) {
        if (!videoRef.current) return;
        videoRef.current.currentTime += duration;
    }
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

    if (!quality) return null;

    return (
        <div
            id={"video-player"}
            className="group/video relative flex w-full bg-none"
        >
            {type === "embed" && (
                <div
                    className={`absolute top-0 right-0 left-0 z-50 text-white opacity-0 transition-opacity group-focus-within/video:opacity-100 group-hover/video:opacity-100 before:pointer-events-none before:absolute before:top-0 before:-z-10 before:aspect-3/1 before:w-full before:bg-linear-to-b before:from-black/75 before:to-transparent before:content-[''] ${
                        paused ? "opacity-100" : ""
                    }`}
                >
                    <a
                        className="mt-2 ml-4 block cursor-pointer text-xl text-white no-underline opacity-[0.85] hover:opacity-100"
                        href={`/video/${video.url}`}
                        target="_blank"
                    >
                        {video.name}
                    </a>
                </div>
            )}
            <video
                ref={videoRef}
                src={`/api/video?v=${video.url}&q=${quality}`}
                className="aspect-video w-full"
                onLoadStart={handleLoadStart}
                onLoadedData={handleLoadedData}
                onTimeUpdate={handleTimeUpdate}
                onPlaying={() => setLoading(false)}
                onClick={handleVideoClick}
                onVolumeChange={handleVolumeChange}
            ></video>
            {/* loading indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div
                    className={`${
                        loading ? "block" : "hidden"
                    } h-12 w-12 animate-spin rounded-full border-4 border-solid border-b-transparent`}
                ></div>
            </div>
            {/* thumbnail image */}
            {thumbnails.length > 0 && (
                <Image
                    ref={thumbnailImgRef}
                    alt="thumbnail"
                    className={`${
                        delayedScrubbing ? "block" : "hidden"
                    } absolute top-0 right-0 bottom-0 left-0 h-full w-full brightness-50`}
                    src={thumbnails[0]}
                    width={"128"}
                    height={"72"}
                />
            )}
            {/* video controls container */}
            <div
                className={`absolute right-0 bottom-0 left-0 z-50 text-white opacity-0 transition-opacity group-focus-within/video:opacity-100 group-hover/video:opacity-100 before:pointer-events-none before:absolute before:bottom-0 before:z-[-1] before:aspect-6/1 before:w-full before:bg-linear-to-t before:from-black/75 before:to-transparent before:content-[''] focus-within:opacity-100 hover:opacity-100 ${
                    paused || isTouchDevice() ? "opacity-100" : ""
                }`}
            >
                {/* timeline container */}
                <div
                    ref={timelineRef}
                    className="group/timeline ms-2 me-2 flex h-4 cursor-pointer items-end"
                    onMouseMove={handleMouseOverMove}
                    onMouseDown={toggleScrubbing}
                    onTouchStart={toggleScrubbing}
                >
                    {/* timeline */}
                    <div
                        className={`timeline relative h-[3px] w-full bg-stone-500/50 group-hover/timeline:h-[35%] before:absolute before:top-0 before:bottom-0 before:left-0 before:bg-neutral-400 before:content-[''] group-hover/timeline:before:block ${
                            isScrubbing ? "before:block" : "before:hidden"
                        } after:absolute after:top-0 after:bottom-0 after:left-0 after:z-1 after:bg-violet-500 after:content-['']`}
                    >
                        {/* preview image */}
                        {thumbnails.length > 0 && (
                            <Image
                                ref={previewImgRef}
                                alt="preview"
                                className={`preview-img group-hover/timeline:block ${
                                    delayedScrubbing ? "block" : "hidden"
                                } absolute top-[-1rem] aspect-video h-20 -translate-x-1/2 -translate-y-full rounded border-2 border-solid border-white`}
                                src={thumbnails[0]}
                                width={"128"}
                                height={"72"}
                            />
                        )}

                        {/* thumb */}
                        <div
                            className={`thumb-indicator absolute -top-1/2 z-2 aspect-1/1 h-[200%] -translate-x-1/2 scale-0 rounded-full bg-violet-500 transition-transform group-hover/timeline:scale-100`}
                        ></div>
                        {/* buffered timeline */}
                        <div
                            ref={bufferedRef}
                            className="absolute top-0 bottom-0 h-full bg-white opacity-50"
                        ></div>
                    </div>
                </div>
                {/* controls */}
                <div className="flex items-center gap-2 p-1">
                    {/* play/pause button */}
                    <ControlButton
                        onClick={handleVideoClick}
                        title={paused ? "Play" : "Pause"}
                    >
                        {!paused ? <VideoPausedIcon /> : <VideoPlayIcon />}
                    </ControlButton>
                    {/* volume icon */}
                    <div className="group/vol flex items-center hover:flex">
                        <ControlButton
                            onClick={handleMute}
                            title={"Mute/Unmute"}
                        >
                            {volumeLevel === "high" ? (
                                <VolumeHighIcon />
                            ) : volumeLevel === "low" ? (
                                <VolumeLowIcon />
                            ) : (
                                <VolumeMutedIcon />
                            )}
                        </ControlButton>
                        {/* volume slider */}
                        <input
                            ref={volumeSliderRef}
                            type="range"
                            min="0"
                            max="1"
                            step="any"
                            title="Volume slider"
                            className={`volume-slider h-[0.3rem] origin-left cursor-pointer appearance-none rounded-2xl bg-linear-to-r from-white to-stone-500/50 outline-hidden transition-all group-hover/vol:w-24 group-hover/vol:scale-x-100 focus-within:w-24 focus-within:scale-x-100 ${
                                isTouchDevice()
                                    ? "w-24 scale-x-100"
                                    : "w-[1px] scale-x-0"
                            }`}
                            onChange={handleSliderInput}
                        ></input>
                    </div>
                    {/* current time / total time */}
                    <div className="flex grow items-center gap-1">
                        <div>{time}</div>/
                        <div>
                            {videoRef.current?.duration
                                ? formatDuration(videoRef.current.duration)
                                : "0:00"}
                        </div>
                    </div>
                    {/* playback speed */}
                    <ControlButton
                        className="w-12 text-lg"
                        title="Playback speed"
                        onClick={handleSpeed}
                    >
                        {speed}x
                    </ControlButton>
                    {/* list of video qualities */}
                    <div className="relative min-w-[4rem]" ref={qualityRef}>
                        <ControlButton
                            className="w-full"
                            title="Video resolution"
                            onClick={() => setPopup((prev) => !prev)}
                        >
                            {quality}p
                        </ControlButton>
                        <ul
                            className={`${
                                popup ? "block" : "hidden"
                            } absolute -top-28 bg-stone-900/50 text-center leading-6`}
                        >
                            {qualityList.map((i, idx) => (
                                <ListItem
                                    key={`li-${idx}`}
                                    onClick={() => handleQualitySelect(i)}
                                >
                                    {i}p
                                </ListItem>
                            ))}
                        </ul>
                    </div>
                    {/* full screen button */}
                    <ControlButton
                        onClick={handleFullScreen}
                        title={
                            isFullScreen
                                ? "Close fullscreen"
                                : "Enter fullscreen"
                        }
                        disabled={type === "embed"}
                    >
                        {isFullScreen ? <VideoFullClose /> : <VideoFullOpen />}
                    </ControlButton>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
