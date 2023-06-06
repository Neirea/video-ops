import { ChangeEvent, FormEvent, useState } from "react";
import FormInput from "../FormInput";
import Heading from "../HeadingOne";
import Button from "../Button";
import FileInput from "../FileInput";
import generateShortId from "@/utils/generateShortId";
import trackedRequest from "@/utils/trackedRequest";
import Transcoding from "./Transcoding";

const Menu = ({ fetchVideos }: { fetchVideos: () => void }) => {
    const [token, setToken] = useState("");
    const [fileNameInput, setFileNameInput] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | undefined>();
    const [isUploading, setIsUploading] = useState(false);
    const [isTranscoding, setIsTranscoding] = useState(false);
    const [status, setStatus] = useState("");
    const [stage, setStage] = useState(0);

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

    const trackUploadStatus = (fileName: string) => {
        //create websocket connection
        const socket = createWSConnection(fileName);
        // picture of uploading
        socket.addEventListener("message", (event) => {
            const { status, msg } = JSON.parse(event.data);
            if (status === "checked") {
                setStage(2);
                setStatus(msg);
            }
            if (status === "processed") {
                setStatus(msg + " processed");
                if (msg === "1080p") setStage(3);
            }
            if (status === "done") {
                setStatus("Finished transcoding");
                setStage(0);
                setIsTranscoding(false);
                //refetch video list
                fetchVideos();
                socket.close();
            }
        });
    };

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const file = selectedFile;
        const fileReader = new FileReader();

        if (fileNameInput.length < 2) return;
        if (!file) return;

        fileReader.onload = async (ev) => {
            if (!ev.target?.result) return;
            const fileSize = (ev.target.result as ArrayBuffer).byteLength;
            if (fileSize > 2 * 10 ** 9) return;
            let CHUNK_SIZE = 10 ** 7; //10Mb - min size for chunk
            const chunkCount = Math.ceil(fileSize / CHUNK_SIZE);

            //generate file name
            const extension = file.name.split(".").pop()?.toLowerCase();
            const fileName =
                fileNameInput + "@@@" + generateShortId() + `.${extension}`;

            //can't do more than 10000 chunks for upload
            const isSuccess = chunkCount <= 10000;
            if (!isSuccess) {
                setStatus("Wrong file format");
                return;
            }

            setIsUploading(true);
            setStatus("Initializing upload");

            try {
                //initialize upload
                const { UploadId, Key } = await createUpload(token, fileName);

                //get urls for client to upload file chunks
                const parts = await getUploadUrls(
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
                setStatus("Finalizing upload...");
                await completeUpload(token, UploadId, Key, results);
            } catch (error: any) {
                //add: resetUI
                setIsUploading(false);
                setStatus(error.message);
                return;
            }
            setIsUploading(false);
            setIsTranscoding(true);
            setStage(1);

            trackUploadStatus(fileName);
        };
        fileReader.readAsArrayBuffer(file);
    }

    return (
        <>
            <a href="/">
                <Heading>Video Ops</Heading>
            </a>
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
                    <Transcoding stage={stage} />
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

export async function createUpload(token: string, fileName: string) {
    const uploadResult = await fetch("/api/create-upload", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            token: token,
        },
        body: JSON.stringify({
            key: fileName,
        }),
    });
    if (!uploadResult.ok) {
        throw await uploadResult.json();
    }
    const { UploadId, Key } = await uploadResult.json();
    return { UploadId, Key };
}

export async function getUploadUrls(
    token: string,
    UploadId: string,
    Key: string,
    chunkCount: number
) {
    const uploadUrlsResult = await fetch("/api/get-upload-urls", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            token: token,
        },
        body: JSON.stringify({
            UploadId,
            Key,
            parts: chunkCount,
        }),
    });
    if (!uploadUrlsResult.ok) throw await uploadUrlsResult.json();
    const { parts } = await uploadUrlsResult.json();
    return parts;
}

export async function trackUpload(
    chunksArray: (string | ArrayBuffer)[],
    fileSize: number,
    parts: any[],
    handleStatus: (v: string) => void
) {
    const reqProgress: {
        current: number;
        total: number;
        items: number[];
    } = { total: fileSize, current: 0, items: [] };
    const partRequests: any[] = [];
    for (let i = 0; i < chunksArray.length; i++) {
        reqProgress.items[i] = 0;
        partRequests.push(
            trackedRequest({
                url: parts[i].signedUrl,
                body: chunksArray[i],
                idx: i,
                reqProgress,
                handleStatus,
            })
        );
    }
    const partResults = await Promise.all(partRequests);
    const results = partResults.map(({ ETag, PartNumber }) => {
        return {
            ETag,
            PartNumber,
        };
    });
    return results;
}

export async function completeUpload(
    token: string,
    UploadId: string,
    Key: string,
    results: {
        ETag: any;
        PartNumber: any;
    }[]
) {
    const completeResult = await fetch("/api/complete-upload", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            token: token,
        },
        body: JSON.stringify({
            Key,
            UploadId,
            parts: results,
        }),
    });
    if (!completeResult.ok) throw await completeResult.json();
    await completeResult.json();
}

export function splitBuffer(
    buffer: string | ArrayBuffer,
    chunkCount: number,
    chunkSize: number
) {
    const chunksArray = [];

    for (let chunkId = 0; chunkId < chunkCount; chunkId++) {
        const chunk = buffer.slice(
            chunkId * chunkSize,
            chunkId * chunkSize + chunkSize
        );
        chunksArray.push(chunk);
    }
    return chunksArray;
}

export function createWSConnection(fileName: string) {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
    socket.addEventListener("open", () => {
        socket.send(
            JSON.stringify({
                type: "upload",
                fileName: fileName,
            })
        );
    });
    return socket;
}

export default Menu;

