import { VideoType } from "@/models/Video";
import HeadingTwo from "../HeadingTwo";
import Link from "next/link";

const UploadedVideos = ({
    videoNames,
}: {
    videoNames: VideoType[] | undefined;
}) => {
    return (
        <>
            <HeadingTwo>Uploaded Videos</HeadingTwo>
            <ul>
                {videoNames?.map((i) => {
                    return (
                        <li
                            key={i._id.toString()}
                            className="my-1 text-xl opacity-[85%] hover:opacity-100"
                        >
                            <Link href={`/video/${i.url}`}>{i.name}</Link>
                        </li>
                    );
                })}
            </ul>
        </>
    );
};

export default UploadedVideos;
