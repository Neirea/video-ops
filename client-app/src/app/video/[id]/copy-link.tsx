"use client";
import getIframeLink from "@/utils/getIframeLink";
import { useState, useEffect } from "react";
import type { MouseEvent } from "react";

const CopyLink = ({ url }: { url: string }) => {
    const [origin, setOrigin] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    function handleLinkSelect(e: MouseEvent) {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(e.target as Node);
        const stringRange = range.toString().trim();

        selection.removeAllRanges();
        if (selection.toString() != stringRange) {
            selection.addRange(range);
        }
    }
    function handleLinkBlur() {
        window.getSelection()?.removeAllRanges();
    }

    function handleCopy() {
        // if (!currentVideo) return;
        void navigator.clipboard.writeText(getIframeLink(origin, url));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (!origin) return null;

    return (
        <div className="align-center flex w-full gap-2">
            <label className="shrink-0">Embedded video:</label>
            <div
                className="resize-none border-b-2 border-solid border-stone-500/50 bg-none text-base text-white"
                onClick={handleLinkSelect}
                onBlur={handleLinkBlur}
            >
                {getIframeLink(origin, url)}
            </div>
            <button
                className="relative text-white"
                onClick={handleCopy}
                title="Copy embed link"
            >
                {!copied ? (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="50.788"
                        height="50.723"
                        viewBox="0 0 50.788 50.723"
                        className="h-6 w-6 invert"
                    >
                        <path
                            id="Copy-Icon-SVG-098567"
                            d="M8.213,49.723A8.222,8.222,0,0,1,0,41.511V17A8.222,8.222,0,0,1,8.213,8.787H32.724A8.222,8.222,0,0,1,40.936,17V41.511a8.222,8.222,0,0,1-8.212,8.213ZM4,17V41.511a4.217,4.217,0,0,0,4.214,4.212H32.724a4.217,4.217,0,0,0,4.212-4.212V17a4.218,4.218,0,0,0-4.212-4.213H8.213A4.218,4.218,0,0,0,4,17ZM41.575,36.936a4.219,4.219,0,0,0,4.214-4.213V11.245A7.254,7.254,0,0,0,38.543,4H17.064a4.217,4.217,0,0,0-4.212,4.214h-4A8.221,8.221,0,0,1,17.064,0H38.543A11.258,11.258,0,0,1,49.788,11.245V32.723a8.221,8.221,0,0,1-8.213,8.212Z"
                            transform="translate(0.5 0.5)"
                            stroke="rgba(0,0,0,0)"
                        />
                    </svg>
                ) : (
                    <div className="h-6 w-6 before:absolute before:-top-6 before:right-0 before:z-50 before:rounded-sm before:bg-stone-700 before:px-1 before:py-0 before:content-['Copied']">
                        ✔
                    </div>
                )}
            </button>
        </div>
    );
};

export default CopyLink;
