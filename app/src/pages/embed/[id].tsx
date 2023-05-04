import VideoPlayer from "@/components/video-player/VideoPlayer";
import dbConnect from "@/lib/connect-db";
import { Video, VideoType } from "@/models/Video";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

const EmbedVideo = ({
    video,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    return <VideoPlayer type="embed" video={video} />;
};

export const getServerSideProps: GetServerSideProps<{
    video: VideoType;
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
    return {
        props: { video: JSON.parse(JSON.stringify(video)) },
    };
};

export default EmbedVideo;
