import { MutableRefObject, useEffect } from "react";

/* Hook that sets state to false on click outside of the passed ref */
export const useOutsideClick = (
    refs: Array<MutableRefObject<any>>,
    handleClose: () => void
) => {
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                refs.every(
                    (ref) =>
                        ref.current != null && !ref.current.contains(e.target)
                )
            ) {
                handleClose();
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, [refs, handleClose]);
};
