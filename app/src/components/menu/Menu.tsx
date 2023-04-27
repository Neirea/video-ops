import { ChangeEvent, FormEvent, useState } from "react";
import FormInput from "../FormInput";
import Heading from "../HeadingOne";
import Button from "../Button";
import FileInput from "../FileInput";
import generateShortId from "@/utils/generateShortId";
import trackedRequest from "@/utils/trackedRequest";

const Menu = () => {
    const [token, setToken] = useState("");
    const [fileName, setFileName] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | undefined>();
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [status, setStatus] = useState("");

    function handleTokenInput(e: ChangeEvent<HTMLInputElement>) {
        setToken(e.target.value);
    }
    function handleFileNameInput(e: ChangeEvent<HTMLInputElement>) {
        setFileName(e.target.value);
    }

    function handleSelectedFile(e: ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || !e.target.files.length) {
            setSelectedFile(undefined);
            return;
        }
        // using the first image instead of multiple
        setSelectedFile(e.target.files[0]);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const file = selectedFile;
        const fileReader = new FileReader();

        if (fileName.length < 2) return;
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
            const fileName = generateShortId() + `.${extension}`;

            if (isSuccess) {
                setIsUploading(true);
                const reqProgress: {
                    total: number;
                    items: { loaded?: number }[];
                } = { total: fileSize, items: [] };

                try {
                    const uploadResult = await fetch("/create-upload", {
                        method: "POST",
                        headers: {
                            "content-type": "application/json",
                            token: token,
                        },
                        body: JSON.stringify({
                            name: fileName,
                        }),
                    });
                    if (!uploadResult.ok) throw await uploadResult.json();
                    const { UploadId, Key } = await uploadResult.json();

                    //get urls for client to upload file chunks
                    const uploadUrlsResult = await fetch("/get-upload-urls", {
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
                    const completeResult = await fetch("/complete-upload", {
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
                } catch (error) {
                    //add: resetUI
                    setStatus("");
                    reqProgress.total = 0;
                    reqProgress.items = [];
                    return;
                }
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
                className="flex flex-col items-center gap-2"
            >
                <FormInput value={token} handleInput={handleTokenInput}>
                    Enter your token
                </FormInput>
                <FormInput value={fileName} handleInput={handleFileNameInput}>
                    Enter video name
                </FormInput>
                <FileInput
                    type="button"
                    handleInput={handleSelectedFile}
                    disabled={isUploading}
                >
                    Choose File
                </FileInput>
                <div className="min-h-[24px]">{selectedFile?.name}</div>
                <Button type="submit" disabled={isUploading}>
                    Read & Upload
                </Button>
            </form>
        </>
    );
};

export default Menu;
