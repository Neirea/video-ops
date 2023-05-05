import VideoPlayer from "@/components/video-player/VideoPlayer";
import dbConnect from "@/lib/connect-db";
import { Video, VideoType } from "@/models/Video";
import getImageUrl from "@/utils/getImageUrl";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

const EmbedVideo = ({
    video,
    imageUrl,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    return <VideoPlayer type="embed" video={video} imageUrl={imageUrl} />;
};

export const getServerSideProps: GetServerSideProps<{
    video: VideoType;
    imageUrl: string;
}> = async ({ query }) => {
    await dbConnect();
    // list of videos
    const videoUrl = query.id as string | undefined;
    const video = await Video.findOne({ url: videoUrl });

    if (!video) {
        return {
            notFound: true,
        };
    }
    const imageUrl = await getImageUrl(video.url);

    return {
        props: { video: JSON.parse(JSON.stringify(video)), imageUrl: imageUrl },
    };
};

export default EmbedVideo;
