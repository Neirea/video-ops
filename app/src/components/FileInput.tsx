import { ButtonHTMLAttributes, ChangeEvent, useId } from "react";

type FileInputProps = ButtonHTMLAttributes<{}> & {
    handleInput: (e: ChangeEvent<HTMLInputElement>) => void;
};

const FileInput = ({
    handleInput,
    children,
}: // ...attributes
React.PropsWithChildren<FileInputProps>) => {
    const id = useId();
    return (
        <>
            <input
                id={id}
                type="file"
                accept="video/mp4,video/x-m4v,video/*"
                className="hidden"
                onChange={handleInput}
            ></input>
            <label
                htmlFor={id}
                className="block leading-normal border-solid border-2 border-white rounded px-2 py-1 text-xl cursor-pointer disabled:border-stone-500 disabled:text-stone-500 disabled:cursor-not-allowed [&:not(:disabled)]:hover:bg-zinc-800"
            >
                {children}
            </label>
        </>
    );
};

export default FileInput;
