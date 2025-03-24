"use client";
import generateShortId from "@/src/utils/generateShortId";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import Button from "../Button";
import FileInput from "../FileInput";
import FormInput from "../FormInput";
import Heading from "../HeadingOne";
import Transcoding, { type IProgress } from "./Transcoding";
import { completeUpload, createUpload, getUploadUrls } from "./actions";
import { createWSConnection, splitBuffer, trackUpload } from "./utils";

const defaultProgress: IProgress = { "480": 0, "720": 0, "1080": 0 };

const Menu = () => {
    const router = useRouter();
    const [token, setToken] = useState("");
    const [fileNameInput, setFileNameInput] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | undefined>();
    const [isUploading, setIsUploading] = useState(false);
    const [isTranscoding, setIsTranscoding] = useState(false);
    const [status, setStatus] = useState("");
    const [stage, setStage] = useState(0);
    const [progress, setProgress] = useState(defaultProgress);

    const isDisabled = isUploading || isTranscoding;

    function handleTokenInput(e: ChangeEvent<HTMLInputElement>) {
        setToken(e.target.value);
    }
    function handleFileNameInput(e: ChangeEvent<HTMLInputElement>) {
        setFileNameInput(e.target.value);
    }
    function handleSelectedFile(e: ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || !e.target.files.length) {
            setSelectedFile(undefined);
            return;
        }
        // using the first image instead of multiple
        setSelectedFile(e.target.files[0]);
        if (status) setStatus("");
    }

    function trackUploadStatus(fileName: string) {
        //create websocket connection
        const socket = createWSConnection(fileName);
        // picture of uploading
        socket.addEventListener("message", (event) => {
            const { status, msg } = JSON.parse(event.data);
            if (status === "checked") {
                setStage(2);
                setStatus(msg);
            }
            if (status === "progress") {
                const [key, value] = Object.entries(msg)[0];
                setProgress((prev) => ({ ...prev, [key]: value }));
            }
            if (status === "processed") {
                setStatus(msg + " processed");
                if (msg === "1080p") setStage(3);
            }
            if (status === "done") {
                setStatus("Finished transcoding");
                setStage(0);
                setIsTranscoding(false);
                setProgress(defaultProgress);
                //refetch video list
                router.refresh();
                socket.close();
            }
        });
    }

    async function uploadFile(ev: ProgressEvent<FileReader>, fileName: string) {
        if (!ev.target?.result) return;
        const fileSize = (ev.target.result as ArrayBuffer).byteLength;
        if (fileSize > 2 * 10 ** 9) return;
        let CHUNK_SIZE = 10 ** 7; //10Mb - min size for chunk
        const chunkCount = Math.ceil(fileSize / CHUNK_SIZE);

        //can't do more than 10000 chunks for upload
        const isSuccess = chunkCount <= 10000;
        if (!isSuccess) {
            setStatus("Wrong file format");
            return;
        }

        setIsUploading(true);
        setStatus("Initializing upload");

        if (process.env.NODE_ENV !== "production") {
            setStatus("Please wait...");
            //check status with websockets
            trackUploadStatus(fileName);

            const response = await fetch("http://localhost:8080/pubsub/push", {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream",
                    "file-name": fileName,
                },
                body: ev.target.result,
            });
            if (response.ok) {
                setStage(1);
                setIsUploading(false);
                setIsTranscoding(true);
            } else {
                setIsUploading(false);
            }
            return;
        }

        try {
            //initialize upload
            const { UploadId, Key } = await createUpload(token, fileName);

            //get urls for client to upload file chunks
            const { parts } = await getUploadUrls(
                token,
                UploadId,
                Key,
                chunkCount
            );
            //split file into chunks
            const chunksArray = splitBuffer(
                ev.target.result,
                chunkCount,
                CHUNK_SIZE
            );
            setStatus("0%");
            //track each of the upload part
            const handleStatus = (v: string) => {
                setStatus(v);
            };
            const results = await trackUpload(
                chunksArray,
                fileSize,
                parts,
                handleStatus
            );
            //finish uploading
            setStatus("Please wait...");
            await completeUpload(token, UploadId, Key, results);
            setIsUploading(false);
            setIsTranscoding(true);
            setStage(1);
            //check status with websockets
            trackUploadStatus(fileName);
        } catch (error: any) {
            setIsUploading(false);
            setStatus("Failed to upload");
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const file = selectedFile;
        const fileReader = new FileReader();

        if (fileNameInput.length < 2) return;
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase();
        const fileName =
            fileNameInput + "@@@" + generateShortId() + `.${extension}`;

        fileReader.onload = async (ev) => uploadFile(ev, fileName);
        fileReader.readAsArrayBuffer(file);
    }

    return (
        <>
            <button onClick={() => (window.location.href = "/")}>
                <Heading>Video Ops</Heading>
            </button>
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-center gap-4"
            >
                <FormInput
                    value={token}
                    handleInput={handleTokenInput}
                    disabled={isDisabled}
                >
                    Enter your token
                </FormInput>
                <FormInput
                    value={fileNameInput}
                    handleInput={handleFileNameInput}
                    disabled={isDisabled}
                >
                    Enter video name
                </FormInput>
                <FileInput
                    handleInput={handleSelectedFile}
                    disabled={isDisabled}
                >
                    Choose File
                </FileInput>
                {/* selected file name */}
                <div className="min-h-[1.5rem] max-w-[90%] text-ellipsis overflow-hidden whitespace-nowrap cursor-default">
                    {selectedFile?.name}
                </div>
                {isTranscoding ? (
                    <Transcoding stage={stage} progress={progress} />
                ) : (
                    <Button
                        type="submit"
                        disabled={isDisabled || !selectedFile}
                    >
                        Read & Upload
                    </Button>
                )}
            </form>
            {/* current status */}
            <div className="min-h-[1.75rem] max-w-[90%] text-xl text-pink-300 text-ellipsis overflow-hidden whitespace-nowrap cursor-default">
                {status}
            </div>
        </>
    );
};

export default Menu;
