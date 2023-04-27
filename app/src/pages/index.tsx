import { Inter } from "next/font/google";
import Head from "next/head";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Video } from "@/models/Video";
import dbConnect from "@/lib/connect-db";
import { VideoType } from "@/models/Video";
import Menu from "@/components/menu/Menu";
import UploadedVideos from "@/components/menu/UploadedVideos";

const inter = Inter({ subsets: ["latin"] });

export default function Home({
    videoNames,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <>
            <Head>
                <title>Video Ops</title>
                {/* add: metatags and stuff */}
            </Head>
            <main
                className={`flex min-h-{90vh} flex-col items-center ${inter.className}`}
            >
                <Menu />
                <UploadedVideos videoNames={videoNames} />
            </main>
        </>
    );
}

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
