import VideoPlayer from "@/components/video-player/VideoPlayer";
import dbConnect from "@/lib/db";
import { Video } from "@/models/Video";
import getImageUrl from "@/utils/getImageUrl";

const EmbedVideo = async (props: { params: Promise<{ id: string }> }) => {
    const params = await props.params;
    const { video, imageUrl } = (await getVideoData(params.id)) || {};
    if (!video || !imageUrl) return null;
    return <VideoPlayer type="embed" video={video} imageUrl={imageUrl} />;
};

async function getVideoData(videoUrl: string | string[] | undefined) {
    await dbConnect();
    // get only JSON without _id
    const video = await Video.findOne(
        { url: videoUrl },
        "-_id url name",
    ).lean();

    if (!video) {
        return;
    }
    const imageUrl = await getImageUrl(video.url);

    return { video, imageUrl };
}

export default EmbedVideo;
