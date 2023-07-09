const Transcoding = ({
    stage,
    progress,
}: {
    stage: number;
    progress: { [key: string]: number };
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
                <ul className="flex flex-col gap-2 w-[70%]">
                    {Object.keys(progress).map((key) => {
                        return (
                            <VideoStatusItem
                                key={`vsi-${key}`}
                                percent={progress[key]}
                            >
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
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                    className="bg-violet-500 h-2.5 rounded-full"
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
            className={`flex relative flex-col items-center gap-4 w-12`}
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
            ? "bg-neutral-800"
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
            className={`flex justify-center items-center border-solid border-2 rounded-full h-8 w-8 z-1 ${bgColor} ${borderColor} ${lineCSS}`}
        >
            {status === "COMPLETE" ? "✔" : "?"}
        </span>
    );
};

export default Transcoding;
