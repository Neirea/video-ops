import deleteImages from "@/src/utils/deleteImages";
import deriveImages from "@/src/utils/deriveImages";
import { useEffect, useRef, useState } from "react";

const useThumbnails = (imageUrl: string) => {
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const thumbnailsRef = useRef<string[]>([]);

    useEffect(() => {
        const fetchThumbnails = async () => {
            const fetchedThumbnails = await deriveImages(imageUrl);
            thumbnailsRef.current = fetchedThumbnails;
            setThumbnails(fetchedThumbnails);
        };
        fetchThumbnails();

        return () => {
            deleteImages(thumbnailsRef.current);
        };
    }, [imageUrl]);

    return thumbnails;
};

export default useThumbnails;
