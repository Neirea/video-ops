import { VideoType } from "@/src/models/Video";
import HeadingTwo from "../HeadingTwo";
import Link from "next/link";

const UploadedVideos = ({ videos }: { videos: VideoType[] | undefined }) => {
    return (
        <>
            <HeadingTwo>Uploaded Videos</HeadingTwo>
            <ul>
                {videos?.map((i) => {
                    return (
                        <li
                            key={i.url}
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
