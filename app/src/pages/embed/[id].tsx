import VideoPlayer from "@/components/video-player/VideoPlayer";
import dbConnect from "@/lib/connect-db";
import { Video, VideoType } from "@/models/Video";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";

const EmbedVideo = ({
    videoNames,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    const router = useRouter();
    const videoId = router.query.id as string | undefined;
    const currentVideo = videoNames.find((i) => i.url == videoId);

    if (!currentVideo || !videoId) return null;
    return <VideoPlayer type="embed" video={currentVideo} />;
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

export default EmbedVideo;
