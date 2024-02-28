import VideoPlayer from "@/src/components/video-player/VideoPlayer";
import dbConnect from "@/src/lib/db";
import { Video } from "@/src/models/Video";
import getImageUrl from "@/src/utils/getImageUrl";

const EmbedVideo = async ({ params }: { params: { id: string } }) => {
    const { video, imageUrl } = (await getVideoData(params.id)) || {};
    if (!video || !imageUrl) return null;
    return <VideoPlayer type="embed" video={video} imageUrl={imageUrl} />;
};

async function getVideoData(videoUrl: string | string[] | undefined) {
    await dbConnect();
    // get only JSON without _id
    const video = await Video.findOne(
        { url: videoUrl },
        "-_id url name"
    ).lean();

    if (!video) {
        return;
    }
    const imageUrl = await getImageUrl(video.url);

    return { video, imageUrl };
}

export default EmbedVideo;
