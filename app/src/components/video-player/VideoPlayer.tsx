import {
    ChangeEvent,
    MouseEvent,
    SyntheticEvent,
    useRef,
    useState,
} from "react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import VolumeHighIcon from "../icons/VolumeHighIcon";
import VolumeLowIcon from "../icons/VolumeLowIcon";
import VolumeMutedIcon from "../icons/VolumeMutedIcon";
import VideoPausedIcon from "../icons/VideoPausedIcon";
import VideoPlayIcon from "../icons/VideoPlayIcon";

const VideoPlayer = () => {
    const [loading, setLoading] = useState(true);
    const [paused, setPaused] = useState(true);
    const [volumeLevel, setVolumeLevel] = useState<string>();
    const [speed, setSpeed] = useState("1x");
    const [previewPercent, setPreviewPercent] = useState(0);
    const [progressPercent, setProgressPercent] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const volumeSliderRef = useRef<HTMLInputElement>(null);
    const qualityRef = useRef<HTMLElement>(null);

    //add
    useOutsideClick([qualityRef], () => {});

    async function handleClick() {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (isNaN(video.duration)) return;
        video.paused ? await video.play() : video.pause();
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

    function handleVolumeChange(e: SyntheticEvent<HTMLVideoElement>) {
        const video = e.currentTarget;
        if (!volumeSliderRef?.current) return;
        volumeSliderRef.current.value = video.volume.toString();
        volumeSliderRef.current.style.background = `linear-gradient(90deg, white ${
            video.volume * 100
        }%, var(--unfilled) 0%)`;

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
    return (
        <>
            <div>
                <video
                    ref={videoRef}
                    onWaiting={() => setLoading(true)}
                    onPlaying={() => setLoading(false)}
                    onPlay={() => setPaused(false)}
                    onPause={() => setPaused(true)}
                    onClick={handleClick}
                    onVolumeChange={handleVolumeChange}
                ></video>
                <div
                    className={`${
                        loading ? "block" : "hidden"
                    } absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-4 border-solid border-b-transparent rounded-full animate-spin`}
                ></div>
                <img className="hidden absolute top-0 left-0 right-0 bottom-0 w-full h-full brightness-50"></img>
                {/* .video-controls-container */}
                <div className="absolute left-0 right-0 bottom-0 text-white z-50 opacity-0 transition-opacity">
                    <div className="h-4 ms-2 me-2 cursor-pointer flex items-end">
                        <div
                            className={`bg-stone-500 bg-opacity-50 h-[3px] w-full relative after:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:right-[calc(100% - ${previewPercent} * 100%)] before:bg-neutral-400 before:hidden after:content-[''] after:absolute after:left-0 after:top-0 after:bottom-0 after:right-[calc(100% - ${progressPercent} * 100%)] after:z-[1]`}
                        >
                            <img className="hidden absolute h-20 aspect-video top-[-1rem] -translate-x-1/2 -translate-y-full border-2 border-solid rounded border-white" />
                            {/* add: --scale variable for hover on other elem (thumb-indicator) */}
                            <div
                                className={`absolute translate-x-1/2 scale-0 h-full -top-1/2 left-[calc(${progressPercent} * 100%)] bg-purple-500 rounded-full transition-transform aspect-[1/1] z-[2]`}
                            ></div>
                            <div className="absolute top-0 bottom-0 h-full bg-white opacity-50"></div>
                        </div>
                    </div>
                    {/* .controls */}
                    <div className="flex gap-2 p-1 items-center">
                        {/* playPauseBtn */}
                        <button onClick={handleClick}>
                            {videoRef.current?.paused ? (
                                <VideoPausedIcon />
                            ) : (
                                <VideoPlayIcon />
                            )}
                        </button>
                        <div className="volume-controller">
                            <button onClick={handleMute}>
                                {/* add */}
                                {volumeLevel === "high" ? (
                                    <VolumeHighIcon />
                                ) : volumeLevel === "low" ? (
                                    <VolumeLowIcon />
                                ) : (
                                    <VolumeMutedIcon />
                                )}
                            </button>
                            {/* .volume-slider */}
                            <input
                                ref={volumeSliderRef}
                                // add: check for 50% opacity, .volume-container:hover for this
                                className="w-[1px] origin-left scale-x-0 transition-all appearance-none cursor-pointer outline-none h-[0.3rem] rounded-2xl bg-opacity-50 bg-gradient-to-r from-white to-stone-500 focus-within:w-24 focus-within:scale-x-100"
                                onChange={handleSliderInput}
                            ></input>
                        </div>
                        <div className="flex items-center gap-1 flex-grow"></div>
                        <button className="w-12" title="Playback speed">
                            {speed}
                        </button>
                        <div className="relative min-w-[4rem]"></div>
                        <button className="opacity-50"></button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default VideoPlayer;
