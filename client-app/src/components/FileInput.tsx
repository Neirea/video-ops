import { useId, type ButtonHTMLAttributes, type ChangeEvent } from "react";

interface FileInputProps extends ButtonHTMLAttributes<object> {
    handleInput: (e: ChangeEvent<HTMLInputElement>) => void;
}

const FileInput = ({
    handleInput,
    children,
    ...attributes
}: //
React.PropsWithChildren<FileInputProps>) => {
    const id = useId();

    const activeStyles = attributes.disabled
        ? "border-stone-500 text-stone-500 cursor-not-allowed"
        : "border-white hover:bg-zinc-800";

    return (
        <>
            <input
                id={id}
                type="file"
                accept="video/mp4,video/x-m4v,video/*"
                className="hidden"
                onChange={handleInput}
                {...attributes}
            ></input>
            <label
                htmlFor={id}
                className={`block cursor-pointer rounded-sm border-2 border-solid px-2 py-1 text-xl leading-normal ${activeStyles}`}
            >
                {children}
            </label>
        </>
    );
};

export default FileInput;
