export type IProgress = {
    "480": number;
    "720": number;
    "1080": number;
};

const Transcoding = ({
    stage,
    progress,
}: {
    stage: number;
    progress: IProgress;
}) => {
    const stage1 = stage === 1 ? "ACTIVE" : stage > 1 ? "COMPLETE" : "INACTIVE";
    const stage2 = stage === 2 ? "ACTIVE" : stage > 2 ? "COMPLETE" : "INACTIVE";
    const stage3 = stage === 3 ? "ACTIVE" : stage > 3 ? "COMPLETE" : "INACTIVE";

    return (
        <>
            <ul className="flex gap-12">
                {/* status-init */}
                <StatusListItem>
                    <div>Initialize</div>
                    <StatusCircle status={stage1} line={true} />
                </StatusListItem>
                {/* status-video */}
                <StatusListItem>
                    Transcoding
                    <StatusCircle status={stage2} line={true} />
                </StatusListItem>
                {/* status-done */}
                <StatusListItem>
                    <div>Done</div>
                    <StatusCircle status={stage3} />
                </StatusListItem>
            </ul>
            {stage === 2 && (
                <ul className="flex w-[70%] flex-col gap-2">
                    {Object.entries(progress).map(([key, value]) => {
                        return (
                            <VideoStatusItem key={`vsi-${key}`} percent={value}>
                                {`${key}p`}
                            </VideoStatusItem>
                        );
                    })}
                </ul>
            )}
        </>
    );
};

const VideoStatusItem = ({
    children,
    ...attributes
}: React.PropsWithChildren<{ percent: number }>) => {
    return (
        <li>
            <div>{children}</div>
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                    className="h-2.5 rounded-full bg-violet-500"
                    style={{ width: `${attributes.percent}%` }}
                ></div>
            </div>
        </li>
    );
};

const StatusListItem = ({
    children,
    ...attributes
}: React.PropsWithChildren<{ line?: boolean }>) => {
    return (
        <li
            className={`relative flex w-12 flex-col items-center gap-4`}
            {...attributes}
        >
            {children}
        </li>
    );
};

type statusType = "INACTIVE" | "ACTIVE" | "COMPLETE";

const StatusCircle = ({
    status,
    line,
}: {
    status: statusType;
    line?: boolean;
}) => {
    const bgColor =
        status === "COMPLETE"
            ? "bg-violet-500"
            : status === "ACTIVE"
              ? "bg-violet-300"
              : "bg-transparent";
    const borderColor =
        status === "COMPLETE" ? "border-violet-500" : "border-stone-500";

    const lineColor =
        status === "COMPLETE" ? "after:bg-violet-500" : "after:bg-stone-500";

    const lineCSS = line
        ? `after:content-[''] after:absolute after:bottom-4 after:left-10 after:w-[135%] after:h-[2px] ${lineColor}`
        : "";

    return (
        <span
            className={`z-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-solid ${bgColor} ${borderColor} ${lineCSS}`}
        >
            {status === "COMPLETE" ? "✔" : "?"}
        </span>
    );
};

export default Transcoding;
