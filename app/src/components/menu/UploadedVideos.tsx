import { VideoType } from "@/models/Video";
import HeadingTwo from "../HeadingTwo";

const UploadedVideos = ({ videoNames }: { videoNames: VideoType[] }) => {
    return (
        <>
            <HeadingTwo>Uploaded Videos</HeadingTwo>
            <ul>
                {videoNames.map((i) => {
                    return (
                        <li key={i._id.toString()} className="my-1 text-xl">
                            {i.name}
                        </li>
                    );
                })}
            </ul>
        </>
    );
};

export default UploadedVideos;
