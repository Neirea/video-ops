import { useRouter } from "next/router";
import { Inter } from "next/font/google";
import Head from "next/head";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Video } from "@/models/Video";
import dbConnect from "@/lib/connect-db";
import { VideoType } from "@/models/Video";
import Menu from "@/components/menu/Menu";
import UploadedVideos from "@/components/menu/UploadedVideos";
import VideoPlayer from "@/components/video-player/VideoPlayer";
import getIframeLink from "../../utils/getIframeLink";
import { useEffect, useState, MouseEvent } from "react";

const inter = Inter({ subsets: ["latin"] });

const VideoPage = ({
    videoNames,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const router = useRouter();
    const [origin, setOrigin] = useState("");
    const videoId = router.query.id as string | undefined;
    const [videos, setVideos] = useState(videoNames);

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

    if (!currentVideo || !videoId) return null;
    return (
        <>
            <Head>
                <title>{currentVideo.name} - Video Ops</title>
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
                    <UploadedVideos videoNames={videos} />
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
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export const getServerSideProps: GetServerSideProps<{
    videoNames: VideoType[];
}> = async (ctx) => {
    await dbConnect();
    const videoNames = await Video.find({});

    return {
        // workaround to serialize dates
        props: { videoNames: JSON.parse(JSON.stringify(videoNames)) },
    };
};

export default VideoPage;
