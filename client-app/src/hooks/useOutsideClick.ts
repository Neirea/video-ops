import { type RefObject, useEffect } from "react";

/* Hook that sets state to false on click outside of the passed ref */
export const useOutsideClick = (
    refs: Array<RefObject<HTMLElement | null>>,
    handleClose: () => void,
) => {
    useEffect(() => {
        const controller = new AbortController();
        document.addEventListener(
            "click",
            (e) => {
                if (
                    refs.every(
                        (ref) =>
                            ref.current != null &&
                            !ref.current.contains(e.target as Node),
                    )
                ) {
                    handleClose();
                }
            },
            { signal: controller.signal },
        );
        return () => {
            controller.abort();
        };
    }, [refs, handleClose]);
};
