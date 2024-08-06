import { useId, type ButtonHTMLAttributes, type ChangeEvent } from "react";

type FileInputProps = ButtonHTMLAttributes<{}> & {
    handleInput: (e: ChangeEvent<HTMLInputElement>) => void;
};

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
                className={`block leading-normal border-solid border-2 rounded px-2 py-1 text-xl cursor-pointer ${activeStyles}`}
            >
                {children}
            </label>
        </>
    );
};

export default FileInput;
