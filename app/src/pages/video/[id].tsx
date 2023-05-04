import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import Head from "next/head";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Video } from "@/models/Video";
import dbConnect from "@/lib/connect-db";
import { VideoType } from "@/models/Video";
import Menu from "@/components/menu/Menu";
import VideoPlayer from "@/components/video-player/VideoPlayer";
import getIframeLink from "../../utils/getIframeLink";
import { useEffect, useState, MouseEvent } from "react";
import UploadedVideos from "@/components/menu/UploadedVideos";

const inter = Inter({ subsets: ["latin"] });

const VideoPage = ({
    videoNames,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const router = useRouter();
    const [origin, setOrigin] = useState("");
    const [videos, setVideos] = useState(videoNames);
    const [copied, setCopied] = useState(false);

    const videoId = router.query.id as string | undefined;
    const currentVideo = videoNames.find((i) => i.url == videoId);

    useEffect(() => {
        // Check if running on the client-side (browser)
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin);
        }
    }, []);

    function handleLinkSelect(e: MouseEvent) {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(e.target as Node);
        const stringRange = range.toString().trim();

        selection.removeAllRanges();
        if (selection.toString() != stringRange) {
            selection.addRange(range);
        }
    }
    function handleLinkBlur() {
        window.getSelection()?.removeAllRanges();
    }
    async function fetchVideos() {
        const { videoNames } = await fetch("/api/videos").then((res) =>
            res.json()
        );

        setVideos(videoNames);
    }
    function handleCopy() {
        if (!currentVideo) return;
        navigator.clipboard.writeText(getIframeLink(origin, currentVideo.url));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (!currentVideo || !videoId) return null;
    return (
        <>
            <Head>
                <title>{`${currentVideo.name} - Video Ops`}</title>
                <meta
                    name="description"
                    content={`${currentVideo.name} - uploaded video by Video Ops`}
                />
            </Head>
            <main
                className={`flex min-h-{90vh} flex-col lg:flex-row  ${inter.className}`}
            >
                <div className="flex w-full lg:w-96 flex-col items-center pt-8 gap-4 shrink-0 order-2 lg:order-1">
                    <Menu fetchVideos={fetchVideos} />
                    <UploadedVideos videos={videos} />
                </div>
                <div className="grow p-4 pb-0 order-1 lg:order-2">
                    <VideoPlayer
                        key={videoId}
                        type="normal"
                        video={currentVideo}
                    />
                    <h3 className="text-2xl font-semibold my-2 mx-0 self-start"></h3>
                    {origin && (
                        <div className="flex align-center w-full gap-2">
                            <label className="shrink-0">Embedded video:</label>
                            <div
                                className="text-base text-white bg-none border-b-2 border-solid border-stone-500/50 resize-none"
                                onClick={handleLinkSelect}
                                onBlur={handleLinkBlur}
                            >
                                {getIframeLink(origin, currentVideo.url)}
                            </div>
                            <button
                                className="text-white relative"
                                onClick={handleCopy}
                            >
                                {!copied ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="50.788"
                                        height="50.723"
                                        viewBox="0 0 50.788 50.723"
                                        className="invert h-6 w-6"
                                    >
                                        <path
                                            id="Copy-Icon-SVG-098567"
                                            d="M8.213,49.723A8.222,8.222,0,0,1,0,41.511V17A8.222,8.222,0,0,1,8.213,8.787H32.724A8.222,8.222,0,0,1,40.936,17V41.511a8.222,8.222,0,0,1-8.212,8.213ZM4,17V41.511a4.217,4.217,0,0,0,4.214,4.212H32.724a4.217,4.217,0,0,0,4.212-4.212V17a4.218,4.218,0,0,0-4.212-4.213H8.213A4.218,4.218,0,0,0,4,17ZM41.575,36.936a4.219,4.219,0,0,0,4.214-4.213V11.245A7.254,7.254,0,0,0,38.543,4H17.064a4.217,4.217,0,0,0-4.212,4.214h-4A8.221,8.221,0,0,1,17.064,0H38.543A11.258,11.258,0,0,1,49.788,11.245V32.723a8.221,8.221,0,0,1-8.213,8.212Z"
                                            transform="translate(0.5 0.5)"
                                            stroke="rgba(0,0,0,0)"
                                        />
                                    </svg>
                                ) : (
                                    <div className="h-6 w-6 before:absolute before:content-['Copied'] before:bg-stone-700 before:-top-6 before:right-0 before:z-50 before:px-1 before:py-0 before:rounded">
                                        ✔
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export const getServerSideProps: GetServerSideProps<{
    videoNames: VideoType[];
}> = async ({ res }) => {
    await dbConnect();
    const videoNames = await Video.find({});

    res.setHeader(
        "Cache-Control",
        "public, s-maxage=10, stale-while-revalidate=59"
    );

    return {
        // workaround to serialize dates
        props: { videoNames: JSON.parse(JSON.stringify(videoNames)) },
    };
};

export default VideoPage;
