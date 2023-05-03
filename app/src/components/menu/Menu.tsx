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

            const extension = file.name.split(".").pop()?.toLowerCase();
            //can't do more than 10000 chunks for s3
            const isSuccess = chunkCount <= 10000;
            const fileName =
                fileNameInput + "@@@" + generateShortId() + `.${extension}`;

            if (isSuccess) {
                setIsUploading(true);
                setStatus("Initializing upload");
                const reqProgress: {
                    total: number;
                    items: { loaded?: number }[];
                } = { total: fileSize, items: [] };

                try {
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

                    //get urls for client to upload file chunks
                    const uploadUrlsResult = await fetch(
                        "/api/get-upload-urls",
                        {
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
                        }
                    );
                    if (!uploadUrlsResult.ok)
                        throw await uploadUrlsResult.json();
                    const { parts } = await uploadUrlsResult.json();
                    //result of s3 responses
                    const chunksArray = [];
                    const partRequests: any[] = [];

                    for (let chunkId = 0; chunkId < chunkCount; chunkId++) {
                        const chunk = ev.target.result.slice(
                            chunkId * CHUNK_SIZE,
                            chunkId * CHUNK_SIZE + CHUNK_SIZE
                        );
                        chunksArray.push(chunk);
                    }
                    setStatus("0%");

                    chunksArray.forEach((item, idx) => {
                        reqProgress.items[idx] = { loaded: 0 };
                        partRequests.push(
                            trackedRequest(
                                parts[idx].signedUrl,
                                "PUT",
                                item,
                                idx,
                                reqProgress,
                                setStatus
                            )
                        );
                    });

                    const partResetuls = await Promise.all(partRequests);
                    const results = partResetuls.map(({ ETag, PartNumber }) => {
                        return {
                            ETag,
                            PartNumber,
                        };
                    });
                    //finish uploading
                    setStatus("Finalizing upload...");
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
                } catch (error: any) {
                    //add: resetUI
                    setIsUploading(false);
                    setStatus(error.message);
                    reqProgress.total = 0;
                    reqProgress.items = [];
                    return;
                }
                setIsUploading(false);
                setIsTranscoding(true);
                setStage(1);
                //create websocket connection
                const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
                socket.addEventListener("open", () => {
                    socket.send(
                        JSON.stringify({
                            type: "upload",
                            fileName: fileName,
                        })
                    );
                });
                // picture of uploading
                socket.addEventListener("message", (event) => {
                    const { status, msg } = JSON.parse(event.data);
                    switch (status) {
                        case "checked":
                            setStage(2);
                            setStatus(msg);
                            break;
                        case "processed":
                            setStatus(msg + " processed");
                            if (msg === "1080p") setStage(3);
                            break;
                        case "done":
                            setStatus("Finished transcoding");
                            setStage(0);
                            setIsTranscoding(false);
                            //refetch video list
                            fetchVideos();
                            socket.close();
                            break;
                        default:
                            break;
                    }
                });
            } else {
                setStatus("Wrong file format");
            }
        };
        fileReader.readAsArrayBuffer(file);
    }

    return (
        <>
            <Heading>
                <a href="/">Video Ops</a>
            </Heading>
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

export default Menu;
