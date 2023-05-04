import { useEffect, useState } from "react";

const useDelayedValue = (isScrubbing: boolean) => {
    const [delayed, setDelayed] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout | undefined;
        if (isScrubbing) {
            timeout = setTimeout(() => {
                setDelayed(isScrubbing);
            }, 300);
        } else {
            setDelayed(isScrubbing);
            if (timeout) clearTimeout(timeout);
        }
        return () => {
            clearTimeout(timeout);
        };
    }, [isScrubbing]);

    return delayed;
};

export default useDelayedValue;
