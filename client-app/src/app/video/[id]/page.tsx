import { Inter } from "next/font/google";
import Menu from "@/components/menu/Menu";
import UploadedVideos from "@/components/menu/UploadedVideos";
import VideoPlayer from "@//components/video-player/VideoPlayer";
import dbConnect from "@//lib/db";
import { Video } from "@//models/Video";
import getImageUrl from "@//utils/getImageUrl";
import CopyLink from "./copy-link";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(props: {
    params: Promise<{ id: string }>;
}) {
    const params = await props.params;
    const { videoNames } = (await getVideoData(params.id)) || {};
    const currentVideo =
        videoNames?.find((i) => i.url == params.id)?.name || "Not Found";
    return {
        title: `${currentVideo} - Video Ops`,
    };
}

const Page = async (props: { params: Promise<{ id: string }> }) => {
    const params = await props.params;
    const videoId = params.id;
    const { videoNames, imageUrl } = (await getVideoData(params.id)) || {};
    const currentVideo = videoNames?.find((i) => i.url == videoId);

    if (!currentVideo || !videoId) return null;
    return (
        <>
            <main
                className={`min-h-{90vh} flex flex-col lg:flex-row ${inter.className}`}
            >
                <div className="order-2 flex w-full shrink-0 flex-col items-center gap-4 pt-8 lg:order-1 lg:w-96">
                    <Menu />
                    <UploadedVideos videos={videoNames} />
                </div>
                <div className="order-1 grow p-4 pb-0 lg:order-2">
                    <VideoPlayer
                        key={videoId}
                        type="normal"
                        video={currentVideo}
                        imageUrl={imageUrl || ""}
                    />
                    <h3 className="mx-0 my-2 self-start text-2xl font-semibold"></h3>
                    <CopyLink url={currentVideo.url} />
                </div>
            </main>
        </>
    );
};

async function fetchVideos() {
    // get only JSON without _id
    const videoNames = await Video.find({}, "-_id url name").lean();
    return videoNames;
}

async function getVideoData(videoUrl: string | string[] | undefined) {
    await dbConnect();
    const videoNames = await fetchVideos();

    const currentVideo = videoNames.find((i) => i.url === videoUrl);
    if (!currentVideo) {
        return;
    }

    const imageUrl = await getImageUrl(currentVideo.url);
    return { videoNames, imageUrl };
}

export default Page;
